import { NextRequest, NextResponse } from 'next/server'
import { getZai, ZAI_MODEL, isAiAvailable } from '@/lib/zai'
import { db } from '@/lib/db'
import { requireAuth, requireAuthWithCsrf, checkAiTier, jsonError } from '@/lib/api-helpers'
import { logAudit } from '@/lib/auth'
import { withAiTimeout, AiTimeoutError, AI_TIMEOUTS } from '@/lib/ai-timeout'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

function dateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// POST /api/insights
// Body: { days?: number }
// Analyzes the session user's recent adherence + medication data and returns AI insights.
export async function POST(req: NextRequest) {
  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!
  const u = user!

  const tierErr = await checkAiTier(user, 'insights')
  if (tierErr) return tierErr

  // Audit: AI insights access (queries user's medication + adherence sensitive health data)
  await logAudit(user.id, 'insights.read', { resourceType: 'HealthScore' })

  try {
    const { days = 7 } = await req.json()
    const span = Math.min(Math.max(days, 1), 30)

    // Gather data — scoped to the authenticated user. Previously this queried
    // ALL active medications and ALL reminders across every user, which leaked
    // other users' sensitive health data into the LLM prompt.
    const meds = await db.medication.findMany({ where: { userId: u.id, active: true } })
    const medIds = meds.map((m) => m.id)
    const medList = meds.map((m) => ({
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      times: (() => { try { return JSON.parse(m.times); } catch { return String(m.times).split(",").map((t) => t.trim()).filter(Boolean); } })(),
    }))

    // Single batched query replaces up to 30 sequential per-day lookups (N+1).
    const startDate = dateStr(new Date(Date.now() - span * 86_400_000))
    const endDate = dateStr(new Date())
    const allReminders = medIds.length
      ? await db.reminder.findMany({
          where: { medicationId: { in: medIds }, date: { gte: startDate, lte: endDate } },
        })
      : []

    // Group reminders by date for daily aggregation.
    const remsByDate = new Map<string, typeof allReminders>()
    for (const r of allReminders) {
      const existing = remsByDate.get((r as any).date) || []
      existing.push((r as any))
      remsByDate.set((r as any).date, existing)
    }

    const daily: {
      date: string
      total: number
      taken: number
      skipped: number
      pending: number
    }[] = []
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const ds = dateStr(d)
      const rems = remsByDate.get(ds) || []
      daily.push({
        date: ds,
        total: rems.length,
        taken: rems.filter((r) => r.status === 'taken').length,
        skipped: rems.filter((r) => r.status === 'skipped').length,
        pending: rems.filter((r) => r.status === 'pending').length,
      })
    }

    const totalDoses = daily.reduce((s, d) => s + d.total, 0)
    const totalTaken = daily.reduce((s, d) => s + d.taken, 0)
    const totalSkipped = daily.reduce((s, d) => s + d.skipped, 0)
    const adherence =
      totalDoses === 0 ? 0 : Math.round((totalTaken / totalDoses) * 100)

    const dataPayload = {
      periodDays: span,
      medications: medList,
      dailyAdherence: daily,
      summary: {
        totalDoses,
        totalTaken,
        totalSkipped,
        adherencePct: adherence,
        activeMedCount: meds.length,
      },
    }

    if (!isAiAvailable()) return NextResponse.json({ insights: [], message: 'AI insights require ZENMUX_API_KEY in .env' })
    const zai = await getZai()

    const completion = await withAiTimeout(
      zai.chat.completions.create({
        model: ZAI_MODEL,
        messages: [
            {
              role: 'assistant',
              content: `You are Kyntha's AI health analyst. Analyze the user's medication adherence data and provide actionable, personalized insights.

Return ONLY valid JSON (no markdown, no extra text) with this exact shape:
{
  "headline": "A short encouraging headline summarizing the period (1 sentence)",
  "adherenceLabel": "Excellent | Good | Fair | Needs improvement",
  "strengths": ["2-3 bullet points about what's going well"],
  "concerns": ["2-3 bullet points about issues, missed doses, or risks"],
  "recommendations": ["3-4 specific, actionable recommendations to improve adherence"],
  "bestStreak": "Description of the best adherence streak observed",
  "worstDay": "Day with the most missed doses (or null if none)",
  "motivationalNote": "A warm, personalized motivational message"
}

If there is no data (totalDoses === 0), return:
{"headline":"No adherence data yet","adherenceLabel":"Needs improvement","strengths":[],"concerns":["No reminders have been logged yet"],"recommendations":["Add medications and start marking them as taken to see insights"],"bestStreak":null,"worstDay":null,"motivationalNote":"Start your medication journey today — consistency is key!"}

Be warm, specific, and practical. Reference actual medication names and days when relevant.`,
            },
            {
              role: 'user',
              content: `Here is my adherence data for the last ${span} days:\n\n${JSON.stringify(dataPayload, null, 2)}${u.allergies ? `\n\nPatient allergies: ${u.allergies}` : ''}`,
            },
          ],
        }),
      AI_TIMEOUTS.COMPLEX
    )

    const content = completion.choices[0]?.message?.content || ''
    let insights: Record<string, unknown>
    try {
      const cleaned = content
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim()
      insights = JSON.parse(cleaned)
    } catch {
      insights = {
        headline: 'Analysis complete',
        adherenceLabel: 'Good',
        strengths: [],
        concerns: [],
        recommendations: [],
        bestStreak: null,
        worstDay: null,
        motivationalNote: content,
      }
    }

    return NextResponse.json({
      insights,
      stats: dataPayload.summary,
      daily: dataPayload.dailyAdherence,
    })
  } catch (error) {
    logger.phiSafeError(error)
    if (error instanceof AiTimeoutError) {
      return NextResponse.json(
        { error: 'Insights generation timed out. Please try again.' },
        { status: 504 }
      )
    }
    return jsonError('Failed to generate insights', 500, 'INSIGHTS_ERROR')
  }
}

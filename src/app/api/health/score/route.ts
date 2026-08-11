import { NextRequest, NextResponse } from 'next/server'
import { recordAudit } from '@/lib/audit-logger'
import { logAudit } from '@/lib/auth'
import { jsonOk, jsonError, requireAuth } from '@/lib/api-helpers'
import { checkCsrf } from '@/lib/csrf'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { todayStr, toISODateTime } from '@/lib/utils'
export const dynamic = 'force-dynamic'

export const runtime = 'nodejs'

// POST /api/health/score — save or update today's health score
export async function POST(req: NextRequest) {
  try {
    const csrfErr = await checkCsrf(req)
    if (csrfErr) return csrfErr

    const { response, user } = await requireAuth(req)
    if (response || !user) return response!

    const userId = user.id
    const body = await req.json().catch(() => null)
    if (!body || typeof body.score !== 'number') {
      return jsonError('score (number) is required', 400)
    }

    const score = Math.max(0, Math.min(100, Math.round(body.score)))
    const breakdown = body.breakdown ?? {}
    // healthScore.date is a DateTime column — a date-only string ("2026-08-11")
    // makes Prisma reject the query with "premature end of input". Normalize
    // anything missing the time suffix to a full ISO-8601 datetime.
    const rawDate = typeof body.date === 'string' && body.date ? body.date : todayStr()
    const date = rawDate.includes('T') ? rawDate : toISODateTime(rawDate)

    const record = await db.healthScore.upsert({
      where: { userId_date: { userId, date } },
      create: {
        userId,
        date,
        score,
        breakdown: JSON.stringify(breakdown),
      },
      update: {
        score,
        breakdown: JSON.stringify(breakdown),
      },
    })

    await recordAudit(userId, 'health.score.update', {
      resourceType: 'HealthScore', resourceId: record.id,
      httpMethod: 'POST', outcome: 'success',
    })

    return jsonOk({
      id: record.id,
      userId: record.userId,
      date: record.date,
      score: record.score,
      breakdown: record.breakdown,
      createdAt: record.createdAt,
    })
  } catch (err) {
    logger.phiSafeError(err)
    return jsonError('Failed to save health score', 500)
  }
}

// GET /api/health/score — retrieve last 30 days of scores
export async function GET(req: NextRequest) {
  try {
    const { response, user } = await requireAuth(req)
    if (response || !user) return response!

    const userId = user.id
    const sp = req.nextUrl.searchParams
    const days = Math.min(90, Math.max(1, parseInt(sp.get('days') ?? '30', 10) || 30))

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const scores = await db.healthScore.findMany({
      where: {
        userId,
        createdAt: { gte: cutoff },
      },
      orderBy: { date: 'asc' },
    })

    const parsed = scores.map((s) => ({
      id: s.id,
      date: s.date,
      score: s.score,
      breakdown: (() => { try { return JSON.parse(s.breakdown) } catch { return {} } })(),
      createdAt: s.createdAt.toISOString(),
    }))

    await logAudit(userId, 'health.score.read', { resourceType: 'HealthScore' })
    return jsonOk({ scores: parsed, count: parsed.length })
  } catch (err) {
    logger.phiSafeError(err)
    return jsonError('Failed to retrieve health scores', 500)
  }
}

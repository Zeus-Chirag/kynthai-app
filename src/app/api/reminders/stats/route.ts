import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/security'
import { requireAuth, jsonError, jsonOk, checkConsent } from '@/lib/api-helpers'
import { logAudit } from '@/lib/auth'
import { todayStr, dateStr } from '@/lib/utils'
export const dynamic = 'force-dynamic'

// GET /api/reminders/stats?userId=...&familyMemberId=...
// Returns today's adherence + 7-day weekly adherence breakdown.
export async function GET(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  const u = user!

  await logAudit(user.id, 'reminders.stats', { resourceType: 'Reminder' })
  const consentErr = checkConsent(u)
  if (consentErr) return consentErr

  const sp = req.nextUrl.searchParams
  const familyMemberId = sp.get('familyMemberId')?.trim()
  const userId = sp.get('userId')?.trim() || u.id
  if (userId !== u.id) return jsonError('Forbidden', 403)

  let memberFilter: { familyMemberId?: string; userId?: string } = {}
  if (familyMemberId) {
    const member = await db.familyMember.findUnique({
      where: { id: familyMemberId },
      include: { family: true },
    })
    if (!member || member.family.ownerId !== u.id) {
      return jsonError('Forbidden — family member not owned', 403)
    }
    memberFilter = { familyMemberId }
  } else {
    memberFilter = { userId: u.id }
  }

  const meds = await db.medication.findMany({ where: { active: true, ...memberFilter } })
  const medIds = meds.map((m) => m.id)

  const today = todayStr()
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    days.push(dateStr(new Date(Date.now() - i * 86_400_000)))
  }

  if (medIds.length === 0) {
    return jsonOk({
      today: { total: 0, taken: 0, skipped: 0, pending: 0, adherence: 0 },
      weekly: days.map((d) => ({ date: d, total: 0, taken: 0, adherence: 0 })),
      weeklyAdherence: 0,
    })
  }

  const todayReminders = await db.reminder.findMany({
    where: { date: today, medicationId: { in: medIds } },
  })
  const todayTaken = todayReminders.filter((r) => r.status === 'taken').length
  const todaySkipped = todayReminders.filter((r) => r.status === 'skipped').length
  const todayPending = todayReminders.filter((r) => r.status === 'pending').length

  const weekReminders = await db.reminder.findMany({
    where: { date: { in: days }, medicationId: { in: medIds } },
  })
  const weekly = days.map((d) => {
    const rows = weekReminders.filter((r) => (r as any).date === d)
    const taken = rows.filter((r) => r.status === 'taken').length
    return { date: d, total: rows.length, taken, adherence: rows.length ? Math.round((taken / rows.length) * 100) : 0 }
  })
  const weekTaken = weekReminders.filter((r) => r.status === 'taken').length
  const weeklyAdherence = weekReminders.length ? Math.round((weekTaken / weekReminders.length) * 100) : 0

  return jsonOk({
    today: {
      total: todayReminders.length,
      taken: todayTaken,
      skipped: todaySkipped,
      pending: todayPending,
      adherence: todayReminders.length ? Math.round((todayTaken / todayReminders.length) * 100) : 0,
    },
    weekly,
    weeklyAdherence,
  })
}

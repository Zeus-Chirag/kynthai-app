import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonError, jsonOk, parseJsonCol, checkConsent } from '@/lib/api-helpers'
import { logAudit } from '@/lib/auth'
import { todayStr } from '@/lib/utils'
export const dynamic = 'force-dynamic'

// GET /api/family/pulse — daily health pulse for all family members.
// Authorization: family owner OR any verified family member.
export async function GET(req: NextRequest) {
  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  const u = user!

  await logAudit(user.id, 'family.pulse.read', { resourceType: 'HealthJournal' })

  const consentErr = checkConsent(u)
  if (consentErr) return consentErr

  const ownedFamily = await db.family.findFirst({
    where: { ownerId: u.id },
    include: {
      members: {
        include: {
          medications: { where: { active: true } } as any,
        },
      },
    },
  } as any) as any

  let targetFamily = ownedFamily
  if (!ownedFamily) {
    const membership = (await db.familyMember.findFirst({
      where: { userId: u.id },
    })) as any
    if (membership) {
      targetFamily = await db.family.findFirst({
        where: { id: membership.familyId },
        include: {
          members: {
            include: {
              medications: { where: { active: true } } as any,
            },
          },
        },
      } as any) as any
    }
  }
  if (!targetFamily) return jsonOk([])

  const today = todayStr()
  const medIds = (targetFamily.members as any[]).flatMap((m: any) => (m.medications as any[]).map((med: any) => med.id))

  const todayReminders = medIds.length
    ? await db.reminder.findMany({
        where: { medicationId: { in: medIds }, date: today },
      })
    : []

  const result = (targetFamily.members as any[]).map((m: any) => {
    const memberMedIds = (m.medications as any[]).map((med: any) => med.id)
    const memberReminders = todayReminders.filter((r: any) => memberMedIds.includes(r.medicationId))
    const total = memberReminders.length
    const taken = memberReminders.filter((r: any) => r.status === 'taken').length
    const missed = memberReminders.filter((r: any) => r.status === 'skipped').length
    const adherence = total > 0 ? Math.round((taken / total) * 100) : -1

    let status: string
    if (total === 0) status = 'no_reminders'
    else if (taken === total) status = 'all_taken'
    else if (missed > 0) status = 'missed'
    else status = 'in_progress'

    const lastTaken = memberReminders
      .filter((r: any) => r.takenAt)
      .sort((a: any, b: any) => (b.takenAt!.getTime() - a.takenAt!.getTime()))[0]?.takenAt ?? null

    const score = adherence >= 0 ? adherence : 0

    return {
      memberId: m.id,
      name: m.name,
      relation: m.relation,
      color: m.color,
      score,
      adherence,
      total,
      taken,
      missed,
      status,
      lastTaken: lastTaken ? lastTaken.toISOString() : null,
      conditions: parseJsonCol(m.conditions, []),
    }
  })

  return jsonOk(result)
}

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/security'
import { requireAuth, jsonError, jsonOk, parseJsonCol, checkConsent } from '@/lib/api-helpers'
import { logAudit } from '@/lib/auth'
import { dateStr } from '@/lib/utils'
export const dynamic = 'force-dynamic'

// GET /api/family/analytics — cross-member adherence analytics.
// Authorization: family owner OR any verified family member.
export async function GET(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  const u = user!

  // SECURITY-CRITICAL: reject non-caretaker / non-owner / non-admin roles
  const FAMILY_ACCESS_ROLES: string[] = ['caretaker', 'owner', 'admin']
  if (!FAMILY_ACCESS_ROLES.includes(u.role)) {
    return jsonError('Forbidden — family management requires the caretaker or admin role', 403)
  }

  await logAudit(user.id, 'family.analytics', { resourceType: 'Family' })

  const consentErr = checkConsent(u)
  if (consentErr) return consentErr

  // Check if user owns a family
  const ownedFamily = await db.family.findFirst({
    where: { ownerId: u.id },
    include: { members: { include: { medications: true } } } as any,
  }) as any

  let targetFamily = ownedFamily
  if (!ownedFamily) {
    // Check if user is a member (not owner) of any family
    const membership = (await db.familyMember.findFirst({
      where: { userId: u.id },
    })) as any

    if (!membership) return jsonError('No family found', 404)

    // Fetch family by id to avoid type issues with the family relation include
    targetFamily = await db.family.findFirst({
      where: { id: membership.familyId },
      include: { members: { include: { medications: true } } } as any,
    }) as any
  }
  if (!targetFamily) return jsonError('No family found', 404)

  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(dateStr(d))
  }

  const members = await Promise.all(
    (targetFamily.members as any[]).map(async (m: any) => {
      const medIds = (m.medications as any[]).map((med: any) => med.id)
      const reminders = medIds.length
        ? await db.reminder.findMany({
            where: { medicationId: { in: medIds }, date: { in: days } },
          })
        : []
      const taken = reminders.filter((r: any) => r.status === 'taken').length
      const adherence = reminders.length ? Math.round((taken / reminders.length) * 100) : 0
      const perDay = days.map((d) => {
        const rows = reminders.filter((r: any) => (r as any).date === d)
        const t = rows.filter((r: any) => r.status === 'taken').length
        return { date: d, total: rows.length, taken: t, adherence: rows.length ? Math.round((t / rows.length) * 100) : 0 }
      })
      return {
        id: m.id,
        name: m.name,
        relation: m.relation,
        color: m.color,
        medications: medIds.length,
        weekTotal: reminders.length,
        weekTaken: taken,
        adherence,
        perDay,
        conditions: parseJsonCol(m.conditions, []),
      }
    }),
  )

  const overall = members.length
    ? Math.round(members.reduce((s: number, m: any) => s + m.adherence, 0) / members.length)
    : 0

  return jsonOk({
    family: { id: targetFamily.id, name: targetFamily.name },
    members,
    overallAdherence: overall,
    totalMedications: members.reduce((s: number, m: any) => s + m.medications, 0),
    days,
  })
}

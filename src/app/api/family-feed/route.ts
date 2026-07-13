import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonError, jsonOk, parseJsonCol, checkConsent } from '@/lib/api-helpers'
import { logAudit } from '@/lib/auth'
import { resolveFamilyContext } from '@/lib/family-auth'
export const dynamic = 'force-dynamic'

// GET /api/family-feed — recent family health activity for the authenticated user's family.
export async function GET(req: NextRequest) {
  const { response, user } = await requireAuth(req)
  if (response || !user) return response!

  await logAudit(user.id, 'family.feed')

  const consentErr = checkConsent(user)
  if (consentErr) return consentErr

  const ctx = await resolveFamilyContext(user.id)
  if (!ctx) return jsonOk({ feed: [] })

  // Fetch all family members
  const members = await db.familyMember.findMany({
    where: { familyId: ctx.familyId },
    include: { medications: { where: { active: true } } },
  })

  const memberIds = members.map((m) => m.id)
  const medIds = members.flatMap((m) => m.medications.map((med) => med.id))

  // Fetch reminders from the last 7 days to build activity feed
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentReminders = medIds.length > 0
    ? await db.reminder.findMany({
        where: {
          medicationId: { in: medIds },
          createdAt: { gte: sevenDaysAgo },
        },
        include: { medication: { include: { familyMember: { select: { name: true, color: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    : []

  // Fetch recent family health alerts
  const recentAlerts = await db.familyHealthAlert.findMany({
    where: { familyId: ctx.familyId, createdAt: { gte: sevenDaysAgo } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  // Build feed items from reminders
  const feedItems = recentReminders.map((r) => {
    const member = r.medication.familyMember
    const type = r.status === 'taken' ? 'medication_taken' : 'medication_missed'
    return {
      id: `reminder-${r.id}`,
      type,
      memberName: member?.name ?? 'Unknown',
      memberColor: member?.color ?? '#10b981',
      message: r.status === 'taken'
        ? `Took ${r.medication.name}`
        : `Missed ${r.medication.name} (${r.time})`,
      timestamp: r.createdAt.toISOString(),
    }
  })

  // Build feed items from alerts
  const alertItems = recentAlerts.map((a) => ({
    id: `alert-${a.id}`,
    type: a.type === 'challenge' ? 'streak' : 'alert',
    memberName: a.memberId ? (members.find((m) => m.id === a.memberId)?.name ?? 'Family') : 'Family',
    memberColor: '#f59e0b',
    message: a.title ?? a.message ?? 'Health alert',
    timestamp: a.createdAt.toISOString(),
  }))

  const feed = [...feedItems, ...alertItems]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 40)

  return jsonOk({ feed })
}

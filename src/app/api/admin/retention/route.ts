import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { rateLimit } from '@/lib/security'
import { requireAdmin, requireAuthWithCsrf, jsonOk, jsonError, audit } from '@/lib/api-helpers'
import { getSoftDeleteCutoff, getAuditLogCutoff, type PurgeResult } from '@/lib/retention'
import { logger } from '@/lib/logger'
import { dateStr } from '@/lib/utils'
// Prevent static generation — reads session + DB at runtime
export const dynamic = 'force-dynamic'

// GET /api/admin/retention — churn risk + loyalty analysis across all users.
export async function GET(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAdmin(req)
  if (response || !user) return response!

  try {
    const users = await db.user.findMany({
      where: { role: 'patient' },
      include: {
        medications: { where: { active: true } },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    })

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = dateStr(sevenDaysAgo)

    const risks = await Promise.all(
      users.map(async (u) => {
        const medIds = u.medications.map((m) => m.id)
        const last7Reminders = medIds.length
          ? await db.reminder.findMany({
              where: { medicationId: { in: medIds }, date: { gte: sevenDaysAgoStr } },
            })
          : []
        const skipped = last7Reminders.filter((r) => r.status === 'skipped').length
        const taken = last7Reminders.filter((r) => r.status === 'taken').length
        const lastActivity = u.auditLogs[0]?.createdAt ?? u.createdAt
        const daysInactive = Math.floor((Date.now() - lastActivity.getTime()) / (24 * 60 * 60 * 1000))

        let risk: 'high' | 'medium' | 'low' = 'low'
        const reasons: string[] = []
        if (daysInactive >= 10) { risk = 'high'; reasons.push(`${daysInactive}d inactive`) }
        else if (daysInactive >= 5) { risk = 'medium'; reasons.push(`${daysInactive}d inactive`) }
        if (skipped >= 5) { risk = 'high'; reasons.push(`Skipped ${skipped} doses`) }
        else if (skipped >= 2 && risk === 'low') { risk = 'medium'; reasons.push(`Skipped ${skipped} doses`) }
        if (medIds.length === 0) { reasons.push('No active medications') }

        const adherence = last7Reminders.length ? Math.round((taken / last7Reminders.length) * 100) : 0
        const loyaltyTier = u.subscriptionTier === 'family_pro' ? 'Family Pro'
          : u.subscriptionTier === 'plus' ? 'Plus'
          : 'Free'

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          tier: loyaltyTier,
          daysInactive,
          adherence,
          activeMedications: medIds.length,
          risk,
          reason: reasons.join(' · ') || 'Active',
        }
      }),
    )

    const summary = {
      total: risks.length,
      high: risks.filter((r) => r.risk === 'high').length,
      medium: risks.filter((r) => r.risk === 'medium').length,
      low: risks.filter((r) => r.risk === 'low').length,
      avgAdherence: risks.length ? Math.round(risks.reduce((s, r) => s + r.adherence, 0) / risks.length) : 0,
      plusSubscribers: risks.filter((r) => r.tier !== 'Free').length,
    }

    // Sort by risk severity.
    const order = { high: 0, medium: 1, low: 2 } as const
    risks.sort((a, b) => order[a.risk] - order[b.risk] || b.daysInactive - a.daysInactive)

    return jsonOk({ summary, risks })
  } catch (error) {
    logger.phiSafeError(error, 'admin.retention.GET')
    return jsonError('Internal server error', 500)
  }
}

// ============================================================================
// POST /api/admin/retention — safe soft-delete purge
// ============================================================================
// Retention boundary: soft-deleted records are purged after
// SOFT_DELETE_RETENTION_DAYS (see src/lib/retention.ts).
// Requires admin auth + explicit confirmation.
export async function POST(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!

  // Enforce admin role after CSRF + auth
  const adminCheck = await requireAdmin(req)
  if (adminCheck.response || !adminCheck.user) return adminCheck.response!

  try {
    const body = await req.json().catch(() => null)
    if (!body || body.confirm !== 'PURGE_SOFT_DELETED') {
      return jsonError('Confirmation required: send { confirm: "PURGE_SOFT_DELETED", dryRun: true }', 400)
    }

    const dryRun = body.dryRun !== false
    const standardCutoff = getSoftDeleteCutoff()
    const auditCutoff = getAuditLogCutoff()

    const purgeTargets: Array<{
      name: string
      count: () => Promise<number>
      delete: () => Promise<unknown>
    }> = [
      {
        name: 'user',
        count: () => db.user.count({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
        delete: () => db.user.deleteMany({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
      },
      {
        name: 'appointment',
        count: () => db.appointment.count({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
        delete: () => db.appointment.deleteMany({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
      },
      {
        name: 'chatMessage',
        count: () => db.chatMessage.count({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
        delete: () => db.chatMessage.deleteMany({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
      },
      {
        name: 'family',
        count: () => db.family.count({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
        delete: () => db.family.deleteMany({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
      },
      {
        name: 'medication',
        count: () => db.medication.count({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
        delete: () => db.medication.deleteMany({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
      },
      {
        name: 'reminder',
        count: () => db.reminder.count({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
        delete: () => db.reminder.deleteMany({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
      },
      {
        name: 'emergencyAlert',
        count: () => db.emergencyAlert.count({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
        delete: () => db.emergencyAlert.deleteMany({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
      },
      {
        name: 'healthScore',
        count: () => db.healthScore.count({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
        delete: () => db.healthScore.deleteMany({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
      },
      {
        name: 'healthJournal',
        count: () => db.healthJournal.count({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
        delete: () => db.healthJournal.deleteMany({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
      },
      {
        name: 'userStreak',
        count: () => db.userStreak.count({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
        delete: () => db.userStreak.deleteMany({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
      },
      {
        name: 'userBadge',
        count: () => db.userBadge.count({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
        delete: () => db.userBadge.deleteMany({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
      },
      {
        name: 'prescriptionIntelligence',
        count: () => db.prescriptionIntelligence.count({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
        delete: () => db.prescriptionIntelligence.deleteMany({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
      },
      {
        name: 'referral',
        count: () => db.referral.count({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
        delete: () => db.referral.deleteMany({ where: { deletedAt: { not: null, lt: standardCutoff } } }),
      },
      {
        name: 'auditLog',
        count: () => db.auditLog.count({ where: { deletedAt: { not: null, lt: auditCutoff } } }),
        delete: () => db.auditLog.deleteMany({ where: { deletedAt: { not: null, lt: auditCutoff } } }),
      },
    ]

    const results: PurgeResult[] = []
    for (const target of purgeTargets) {
      const wouldDelete = await target.count()
      if (!dryRun && wouldDelete > 0) {
        await target.delete()
      }
      results.push({ model: target.name, wouldDelete, ...(dryRun ? {} : { deleted: wouldDelete }) })
    }

    const responseBody: Record<string, unknown> = {
      dryRun,
      cutoff: {
        standard: standardCutoff.toISOString(),
        auditLog: auditCutoff.toISOString(),
      },
      results,
    }

    if (dryRun) {
      responseBody.message = 'Dry-run complete. No records were deleted.'
    } else {
      responseBody.message = 'Purge complete.'
    }

    await logAudit(user.id, 'retention.purge', JSON.stringify({
      dryRun,
      results: results.map(r => ({ model: r.model, count: r.wouldDelete })),
    }))

    return jsonOk(responseBody)
  } catch (error) {
    // Security: never log raw DB errors — they may contain sensitive health data
    logger.phiSafeError(error, 'admin.retention')
    return jsonError('Internal server error', 500)
  }
}

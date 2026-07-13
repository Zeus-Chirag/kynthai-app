import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { logAudit } from '@/lib/auth'
import { jsonOk, jsonError } from '@/lib/api-helpers'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return jsonError('Unauthorized', 401)

  // HIPAA: audit this PHI access
  await logAudit(sessionUser.id, 'badges.read', { resourceType: 'UserBadge' });
  try {
    const userId = sessionUser.id
    const isDemo = sessionUser.isDemo || false

    if (isDemo) {
      return jsonOk({
        badges: [
          { badgeType: 'first_prescription', earnedAt: new Date(Date.now() - 86400000 * 7).toISOString() },
          { badgeType: 'streak_7', earnedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
          { badgeType: 'health_journal', earnedAt: new Date(Date.now() - 86400000 * 1).toISOString() },
        ],
      })
    }

    const badges = await db.userBadge.findMany({ where: { userId } })
    return jsonOk({
      badges: badges.map((b) => ({ badgeType: b.badgeType, earnedAt: b.earnedAt.toISOString() })),
    })
  } catch (error) {
    logger.phiSafeError(error)
    return jsonError('Failed to load badges', 500)
  }
}

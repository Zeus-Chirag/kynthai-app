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
  await logAudit(sessionUser.id, 'streaks.read', { resourceType: 'UserStreak' });
  try {
    const userId = sessionUser.id
    const isDemo = sessionUser.isDemo || false

    if (isDemo) {
      return jsonOk({
        streaks: [
          { type: 'daily_meds', count: 5, bestCount: 12 },
          { type: 'weekly_perfect', count: 2, bestCount: 3 },
          { type: 'family_perfect', count: 1, bestCount: 1 },
          { type: 'journal', count: 3, bestCount: 5 },
          { type: 'symptom', count: 4, bestCount: 7 },
        ],
      })
    }

    const streaks = await db.userStreak.findMany({ where: { userId } })
    return jsonOk({
      streaks: streaks.map((s) => ({ type: s.type, count: s.count, bestCount: s.bestCount })),
    })
  } catch (error) {
    logger.phiSafeError(error)
    return jsonError('Failed to load streaks', 500)
  }
}

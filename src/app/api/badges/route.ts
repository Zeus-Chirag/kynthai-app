import { NextRequest, NextResponse } from 'next/server';
import { logAudit } from '@/lib/auth';
import { jsonOk, jsonError, requireAuth } from '@/lib/api-helpers';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { response, user } = await requireAuth(req);
  if (response || !user) return response!;

  // HIPAA: audit this PHI access
  await logAudit(user.id, 'badges.read', { resourceType: 'UserBadge' });
  try {
    const userId = user.id;
    const isDemo = user.isDemo || false;

    if (isDemo) {
      return jsonOk({
        badges: [
          {
            badgeType: 'first_prescription',
            earnedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
          },
          { badgeType: 'streak_7', earnedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
          {
            badgeType: 'health_journal',
            earnedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
          },
        ],
      });
    }

    const badges = await db.userBadge.findMany({ where: { userId } });
    return jsonOk({
      badges: badges.map(b => ({ badgeType: b.badgeType, earnedAt: b.earnedAt.toISOString() })),
    });
  } catch (error) {
    logger.phiSafeError(error);
    return jsonError('Failed to load badges', 500);
  }
}

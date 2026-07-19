import { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/security';
import { jsonError, jsonOk, requireAuth, requireAuthWithCsrf } from '@/lib/api-helpers';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/doctor/presence
 * Returns the current online status for the authenticated doctor.
 */
export async function GET(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const { response, user } = await requireAuth(req);
  if (response || !user || user.role !== 'doctor') return response || jsonError('Unauthorized', 401);

  const profile = await db.doctorProfile.findUnique({
    where: { userId: user.id },
    select: { lastActiveAt: true },
  });

  if (!profile) return jsonError('Doctor profile not found', 404);

  return jsonOk({ lastActiveAt: profile.lastActiveAt });
}

/**
 * POST /api/doctor/presence
 * Doctor updates their presence/heartbeat.
 * Body: { online: boolean } — defaults to true (heartbeat ping)
 *
 * SECURITY: uses requireAuthWithCsrf to prevent cross-site presence spoofing.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  // SECURITY: require CSRF token on state-changing presence update.
  const { response, user } = await requireAuthWithCsrf(req);
  if (response || !user) return response!;
  const u = user!;

  if (u.role !== 'doctor') return jsonError('Unauthorized', 401);

  const body = await req.json().catch(() => ({}));
  const online = typeof body.online === 'boolean' ? body.online : true;

  const profile = await db.doctorProfile.findUnique({
    where: { userId: u.id },
  });
  if (!profile) return jsonError('Doctor profile not found', 404);

  const updated = await db.doctorProfile.update({
    where: { userId: u.id },
    data: {
      lastActiveAt: online ? new Date() : profile.lastActiveAt,
    },
    select: { lastActiveAt: true },
  });

  return jsonOk({ online, lastActiveAt: updated.lastActiveAt });
}

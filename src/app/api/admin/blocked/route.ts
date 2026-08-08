import { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/security';
import { requireAdmin, jsonOk, jsonError, readJson } from '@/lib/api-helpers';
import { blockUser, unblockUser, getBlockedUsers } from '@/lib/fraud-guard';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/admin/blocked — list hard-blocked accounts.
export async function GET(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;
  const { response, user } = await requireAdmin(req);
  if (response || !user) return response!;

  try {
    const blocked = await getBlockedUsers();
    return jsonOk(blocked);
  } catch (error) {
    logger.phiSafeError(error, 'admin.blocked.GET');
    return jsonError('Internal server error', 500);
  }
}

// POST /api/admin/blocked — hard-block a user. Body: { userId | email, reason }
export async function POST(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;
  const { response, user: admin } = await requireAdmin(req);
  if (response || !admin) return response!;

  try {
    const body = await readJson<{ userId?: string; email?: string; reason?: string }>(req);
    const reason = (body?.reason || 'Blocked by admin').slice(0, 500);
    if (!body || (!body.userId && !body.email)) {
      return jsonError('userId or email is required', 400);
    }
    const ok = await blockUser(admin.id, { userId: body.userId, email: body.email }, reason);
    if (!ok) return jsonError('User not found', 404);
    return jsonOk({ blocked: true, reason });
  } catch (error) {
    logger.phiSafeError(error, 'admin.blocked.POST');
    return jsonError('Internal server error', 500);
  }
}

// DELETE /api/admin/blocked — unblock a user. Body: { userId }
export async function DELETE(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;
  const { response, user: admin } = await requireAdmin(req);
  if (response || !admin) return response!;

  try {
    const body = await readJson<{ userId?: string }>(req);
    if (!body || !body.userId) return jsonError('userId is required', 400);
    const ok = await unblockUser(admin.id, body.userId);
    if (!ok) return jsonError('User not found', 404);
    return jsonOk({ blocked: false });
  } catch (error) {
    logger.phiSafeError(error, 'admin.blocked.DELETE');
    return jsonError('Internal server error', 500);
  }
}
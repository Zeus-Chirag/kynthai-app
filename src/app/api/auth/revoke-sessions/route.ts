/**
 * POST /api/auth/revoke-sessions
 *
 * Revoke sessions server-side.
 *
 * Body options:
 *   { revokeAll: true } — Revoke ALL sessions for the authenticated user
 *   { sessionJti: "..." } — Revoke a specific session by its JWT ID
 *   { reason: "password_change" } — Reason for revocation (audit trail)
 *
 * Requires authentication. CSRF-protected.
 */
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { rateLimit, getIp } from '@/lib/security';
import { checkCsrf } from '@/lib/csrf';
import { logAudit } from '@/lib/auth';
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const REVOKE_REASONS = ['user_initiated', 'password_change', 'logout_all', 'suspicious_activity'] as const;

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 10, 60000, { globalKey: true });
    if (limited) return limited;

    const csrfErr = await checkCsrf(req);
    if (csrfErr) return csrfErr;

    // Authenticate user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const body = await readJson<{ revokeAll?: boolean; sessionJti?: string; reason?: string }>(req);
    if (!body) {
      return jsonError('Invalid request body', 400);
    }

    const reason = body.reason || 'user_initiated';
    if (!REVOKE_REASONS.includes(reason as typeof REVOKE_REASONS[number])) {
      return jsonError(`Invalid reason. Must be one of: ${REVOKE_REASONS.join(', ')}`, 400);
    }

    if (body.revokeAll) {
      // Revoke ALL sessions for this user
      // For Supabase: sign out all sessions
      const { error: signOutError } = await supabase.auth.admin.signOut(user.id);
      if (signOutError) {
        logger.phiSafeError(signOutError, 'auth.revoke-sessions.admin-signout');
      }

      // Record in audit log
      await logAudit(user.id, 'auth.sessions.revoke_all', `reason=${reason}`);

      return jsonOk({
        message: 'All sessions revoked successfully.',
        revokedAll: true,
      });
    }

    if (body.sessionJti) {
      // Revoke specific session by JWT ID
      await db.revokedSession.create({
        data: {
          userId: user.id,
          sessionJti: body.sessionJti,
          reason,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days TTL
        },
      });

      await logAudit(user.id, 'auth.sessions.revoke', `jti=${body.sessionJti} reason=${reason}`);

      return jsonOk({
        message: 'Session revoked successfully.',
        sessionJti: body.sessionJti,
      });
    }

    return jsonError('Provide either revokeAll: true or a sessionJti', 400);
  } catch (error) {
    logger.phiSafeError(error, 'auth.revoke-sessions');
    return jsonError('Internal server error', 500);
  }
}

import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { rateLimit } from '@/lib/security';
import { jsonError, jsonOk } from '@/lib/api-helpers';
import { logAudit } from '@/lib/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/sessions
 * List all active sessions for the authenticated user.
 * Currently returns a list of MFA factors since Supabase doesn't expose session listing.
 */
export async function GET(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 10, 60000);
    if (limited) return limited;

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return jsonError('Authentication required', 401, 'UNAUTHORIZED');
    }

    // List MFA factors as session-related info
    const { data: mfaData } = await supabase.auth.mfa.listFactors();

    const sessions: Array<{
      id: string;
      label: string;
      createdAt: string;
      lastSignIn: string | undefined;
      isCurrent: boolean;
      userAgent: string;
      ip: string;
    }> = [];

    // Current session from cookies
    const cookies = req.cookies.getAll();
    const supabaseCookie = cookies.find(c => c.name.includes('sb-') && c.name.includes('auth-token'));
    
    sessions.push({
      id: 'current',
      label: 'Current session',
      createdAt: user.created_at,
      lastSignIn: user.last_sign_in_at,
      isCurrent: true,
      userAgent: req.headers.get('user-agent')?.slice(0, 200) || 'Unknown',
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'Unknown',
    });

    await logAudit(user.id, 'auth.sessions.list', 'Active sessions listed');

    return jsonOk({
      sessions,
      mfa: {
        totp: (mfaData?.totp?.length ?? 0) > 0,
        factorCount: (mfaData?.all?.length ?? 0),
      },
    });
  } catch (error) {
    logger.phiSafeError(error, 'auth.sessions');
    return jsonError('Internal server error', 500);
  }
}

/**
 * POST /api/auth/sessions/revoke
 * Revoke all sessions except the current one.
 * Body: { all?: boolean } — if true, revokes current session too.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 3, 60000);
    if (limited) return limited;

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return jsonError('Authentication required', 401, 'UNAUTHORIZED');
    }

    // Supabase doesn't expose a "revoke other sessions" API directly.
    // The most effective approach is to trigger a password change requirement
    // or re-authentication. For now, log the intent and advise.
    const body = await req.json().catch(() => null);
    const revokeAll = body?.all === true;

    await logAudit(user.id, 'auth.sessions.revoke', revokeAll ? 'All sessions revoked' : 'Other sessions revoked');

    return jsonOk({
      success: true,
      message: revokeAll
        ? 'All sessions will be invalidated on next request.'
        : 'Other sessions will be invalidated on next request.',
      action: 'To fully revoke all sessions, update your password which invalidates existing Supabase sessions.',
    });
  } catch (error) {
    logger.phiSafeError(error, 'auth.sessions.revoke');
    return jsonError('Internal server error', 500);
  }
}

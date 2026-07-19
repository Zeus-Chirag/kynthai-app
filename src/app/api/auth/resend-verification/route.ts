import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { rateLimit } from '@/lib/security';
import { jsonError, jsonOk } from '@/lib/api-helpers';
import { sanitizeText, isValidEmail } from '@/lib/security';
import { logAudit } from '@/lib/auth';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

/**
 * POST /api/auth/resend-verification
 *
 * Resends the verification email using Supabase's built-in email verification.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 3, 15 * 60_000);
    if (limited) return limited;

    const body = await req.json().catch(() => null);
    const email = body?.email ? sanitizeText(String(body.email), 254).toLowerCase() : '';
    if (!email || !isValidEmail(email)) {
      return jsonError('Valid email is required', 400);
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
      },
    });

    // Always return success to prevent email enumeration
    if (error) {
      logger.warn('Verification email resend failed', { error: error.message });
    }

    return jsonOk({ message: 'If an account exists, a verification link has been sent.' });
  } catch (error) {
    logger.phiSafeError(error, 'auth.resend-verification');
    return jsonError('Internal server error', 500);
  }
}

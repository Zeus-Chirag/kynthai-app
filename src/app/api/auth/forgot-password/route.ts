import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { logAudit } from '@/lib/auth';
import { rateLimit } from '@/lib/security';
import { jsonError, jsonOk } from '@/lib/api-helpers';
import { forgotPasswordSchema } from '@/lib/schemas/auth';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 5, 60000, { globalKey: true });
    if (limited) return limited;

    const body = await req.json().catch(() => null);
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Valid email is required', 400, 'VALIDATION_ERROR');
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

    // Supabase handles the reset email — we don't need to check if the user exists
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`,
    });

    // Always return success to prevent email enumeration
    if (error) {
      logger.warn('Password reset request failed', { error: error.message });
    }

    return jsonOk({ message: 'If an account exists, a reset link has been sent.' });
  } catch (error) {
    logger.phiSafeError(error, 'auth.forgot-password');
    return jsonError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

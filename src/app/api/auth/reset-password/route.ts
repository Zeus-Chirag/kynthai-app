import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { rateLimit, validatePasswordStrength } from '@/lib/security';
import { jsonError, jsonOk } from '@/lib/api-helpers';
import { checkCsrf } from '@/lib/csrf';
import { logAudit } from '@/lib/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const ResetSchema = z.object({
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 5, 60000, { globalKey: true });
    if (limited) return limited;

    // CSRF protection
    const csrfErr = await checkCsrf(req);
    if (csrfErr) return csrfErr;

    const body = await req.json().catch(() => null);
    const parsed = ResetSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Password must be at least 8 characters', 400, 'VALIDATION_ERROR');
    }

    // Password strength validation (same as registration)
    const strength = validatePasswordStrength(parsed.data.password);
    if (!strength.valid) {
      return jsonError(strength.errors.join('; '), 400, 'WEAK_PASSWORD');
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

    // The user must have a valid Supabase session (from clicking the reset link)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return jsonError('Invalid or expired reset link. Please request a new one.', 401, 'RESET_UNAUTHORIZED');
    }

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      return jsonError(error.message || 'Password reset failed', 400, 'RESET_FAILED');
    }

    // Audit log the password reset
    await logAudit(user.id, 'auth.password.reset', 'Password reset completed');

    return jsonOk({ message: 'Password reset successful' });
  } catch (error) {
    logger.phiSafeError(error, 'auth.reset-password');
    return jsonError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

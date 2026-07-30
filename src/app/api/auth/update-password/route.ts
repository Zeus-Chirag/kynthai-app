import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { rateLimit, validatePasswordStrength } from '@/lib/security';
import { jsonError, jsonOk } from '@/lib/api-helpers';
import { checkCsrf } from '@/lib/csrf';
import { logAudit } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const UpdatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

/**
 * POST /api/auth/update-password
 *
 * Allows an authenticated user to change their password.
 * Requires current password verification + CSRF protection.
 * Updates in both Supabase Auth and local Prisma password hash.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 5, 60000, { globalKey: true });
    if (limited) return limited;

    const csrfErr = await checkCsrf(req);
    if (csrfErr) return csrfErr;

    const body = await req.json().catch(() => null);
    const parsed = UpdatePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Current password and new password are required', 400, 'VALIDATION_ERROR');
    }

    // Validate new password strength (same as registration)
    const strength = validatePasswordStrength(parsed.data.newPassword);
    if (!strength.valid) {
      return jsonError(strength.errors.join('; '), 400, 'WEAK_PASSWORD');
    }

    // Authenticate the user via Supabase session
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

    const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !supabaseUser) {
      return jsonError('Authentication required', 401, 'UNAUTHORIZED');
    }

    // Verify current password against Supabase
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: supabaseUser.email!,
      password: parsed.data.currentPassword,
    });

    if (signInError) {
      return jsonError('Current password is incorrect', 401, 'INVALID_PASSWORD');
    }

    // Update password in Supabase
    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });

    if (updateError) {
      return jsonError(updateError.message || 'Password update failed', 400, 'UPDATE_FAILED');
    }

    // Also update local Prisma password hash if present
    try {
      const localUser = await db.user.findUnique({ where: { id: supabaseUser.id } });
      if (localUser?.password) {
        const bcrypt = await import('bcryptjs');
        const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
        await db.user.update({
          where: { id: supabaseUser.id },
          data: { password: newHash },
        });
      }
    } catch {
      // Local password update is non-critical — Supabase is the source of truth
    }

    await logAudit(supabaseUser.id, 'auth.password.update', 'Password changed by user');

    return jsonOk({ message: 'Password updated successfully' });
  } catch (error) {
    logger.phiSafeError(error, 'auth.update-password');
    return jsonError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

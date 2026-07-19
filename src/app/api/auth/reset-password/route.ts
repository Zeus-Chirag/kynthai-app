import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { rateLimit } from '@/lib/security';
import { jsonError, jsonOk } from '@/lib/api-helpers';
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

    const body = await req.json().catch(() => null);
    const parsed = ResetSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Password must be at least 8 characters', 400, 'VALIDATION_ERROR');
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
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      return jsonError(error.message || 'Password reset failed', 400, 'RESET_FAILED');
    }

    return jsonOk({ message: 'Password reset successful' });
  } catch (error) {
    logger.phiSafeError(error, 'auth.reset-password');
    return jsonError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

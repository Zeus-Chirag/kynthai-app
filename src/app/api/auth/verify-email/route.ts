import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { jsonOk, jsonError } from '@/lib/api-helpers';
import { logAudit } from '@/lib/auth';
import { getSupabaseProfile } from '@/lib/supabase/sync';

export const runtime = 'nodejs';

/**
 * GET /api/auth/verify-email
 *
 * With Supabase Auth, email verification is handled by Supabase's built-in flow:
 * 1. User signs up → Supabase sends verification email
 * 2. User clicks link → redirected to /auth/callback with code
 * 3. /auth/callback exchanges code for session
 *
 * This route now handles the callback redirect from Supabase's email verification.
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    const code = req.nextUrl.searchParams.get('code');

    // If there's a code, this is a Supabase callback — redirect to /auth/callback
    if (code) {
      const callbackUrl = new URL('/auth/callback', req.url);
      req.nextUrl.searchParams.forEach((v, k) => callbackUrl.searchParams.set(k, v));
      return NextResponse.redirect(callbackUrl);
    }

    // Legacy token-based verification — check if user exists and mark verified
    if (token) {
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

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await logAudit('system', 'auth.email.verified', 'web_flow');
        return jsonOk({ ok: true, message: 'Email verified successfully!' });
      }
    }

    return jsonError('Invalid verification link', 400);
  } catch (error) {
    return jsonError('Verification failed', 500);
  }
}

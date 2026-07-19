import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { logAudit } from '@/lib/auth';
import { isValidEmail, rateLimit, getIp } from '@/lib/security';
import { checkCsrf } from '@/lib/csrf';
import {
  jsonError,
  jsonOk,
  readJson,
  isUserMinor as isUserMinorFlag,
  checkConsent,
} from '@/lib/api-helpers';
import { loginSchema } from '@/lib/schemas';
import { isIpBlocked, logSecurityEvent } from '@/lib/security-audit';
import { getSupabaseProfile } from '@/lib/supabase/sync';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 10, 60000, { globalKey: true });
    if (limited) return limited;

    const csrfErr = await checkCsrf(req);
    if (csrfErr) return csrfErr;

    const ip = getIp(req);
    const ipBlocked = await isIpBlocked(ip);
    if (ipBlocked) {
      return jsonError('Too many failed login attempts from this network. Try again later.', 423);
    }

    const rawBody = await readJson(req);
    if (!rawBody) return jsonError('Validation failed', 422, 'VALIDATION_ERROR');
    const loginResult = loginSchema.safeParse(rawBody);
    if (!loginResult.success) {
      const fields: Record<string, string> = {};
      for (const issue of loginResult.error.issues) {
        fields[String(issue.path.join('.') || 'body')] = issue.message;
      }
      return jsonError('Validation failed', 422, 'VALIDATION_ERROR', { fields });
    }
    const { email, password } = loginResult.data;
    if (!isValidEmail(email)) return jsonError('Valid email is required', 400);

    // ── Supabase Auth: sign in ──────────────────────────────────────────
    let responseCookies: { name: string; value: string; options?: Record<string, unknown> }[] = [];
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            const cookies = req.cookies.getAll();
            return cookies;
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              req.cookies.set({ name, value, ...options });
              responseCookies.push({ name, value, options });
            });
          },
        },
      }
    );

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      console.error('[login] Supabase auth error:', authError?.message, authError?.status);
      await logSecurityEvent('unknown', 'auth.login.failed', `ip=${ip} email=${email}`);
      return jsonError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // ── Get Prisma profile (auto-create if missing) ──────────────────────
    let user = await getSupabaseProfile(authData.user);
    if (!user) {
      // Auto-create Prisma profile from Supabase auth data
      const { syncSupabaseUser } = await import('@/lib/supabase/sync');
      user = await syncSupabaseUser(authData.user);
      if (!user) {
        return jsonError('Failed to create user profile', 500, 'PROFILE_CREATE_FAILED');
      }
    }

    // HIPAA: enforce consent before issuing session
    const consentErr = checkConsent({
      consentAccepted: user.consentAccepted ?? false,
      dataProcessingConsent: user.dataProcessingConsent ?? false,
      aiTrainingConsent: user.aiTrainingConsent ?? false,
    });
    if (consentErr) return consentErr;

    const isUserMinor = isUserMinorFlag({
      dateOfBirth: null,
    } as any);

    await logAudit(user.id, 'auth.login', `role=${user.role}`);

    const responseBody = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      subscriptionTier: user.subscriptionTier,
      isDemo: user.isDemo,
      isUserMinor,
    };
    const res = jsonOk(responseBody);
    // Set Supabase session cookies on the response
    for (const cookie of responseCookies) {
      res.cookies.set(cookie.name, cookie.value, cookie.options as any);
    }
    return res;
  } catch (error) {
    logger.phiSafeError(error, 'login.POST');
    return jsonError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

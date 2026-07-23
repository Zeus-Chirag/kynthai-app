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
    let supabaseResponseCookies: { name: string; value: string; options?: Record<string, unknown> }[] = [];
    let user: any = null;
    let usedLocalAuth = false;

    try {
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
                supabaseResponseCookies.push({ name, value, options });
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
        // Local auth: check Prisma database with bcrypt
        const localUser = await db.user.findUnique({ where: { email } });
        if (localUser?.password) {
          const bcrypt = await import('bcryptjs');
          const valid = await bcrypt.compare(password, localUser.password);
          if (valid) {
            user = localUser;
            usedLocalAuth = true;
          }
        }
        if (!user) {
          await logSecurityEvent('unknown', 'auth.login.failed', `ip=${ip} email=${email}`);
          return jsonError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }
      } else {
        // Supabase auth succeeded - get Prisma profile
              try {
                user = await getSupabaseProfile(authData.user);
              } catch (profileError) {
                throw profileError;
              }
      
              if (!user) {
                try {
                  const { syncSupabaseUser } = await import('@/lib/supabase/sync');
                  user = await syncSupabaseUser(authData.user);
                } catch (syncError) {
                  throw syncError;
                }
                if (!user) {
                  return jsonError('Failed to create user profile', 500, 'PROFILE_CREATE_FAILED');
                }
              }
      }
    } catch (supabaseError) {
      // Supabase client creation failed (e.g., invalid URL/keys), fall back to local auth
      const localUser = await db.user.findUnique({ where: { email } });
      if (localUser?.password) {
        const bcrypt = await import('bcryptjs');
        const valid = await bcrypt.compare(password, localUser.password);
        if (valid) {
          user = localUser;
          usedLocalAuth = true;
        }
      }
      if (!user) {
        await logSecurityEvent('unknown', 'auth.login.failed', `ip=${ip} email=${email}`);
        return jsonError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }
    }

    // Compliance: enforce consent before issuing session
    const consentErr = checkConsent({
      consentAccepted: user.consentAccepted ?? false,
      dataProcessingConsent: user.dataProcessingConsent ?? false,
      aiTrainingConsent: user.aiTrainingConsent ?? false,
    });
    if (consentErr) return consentErr;

    const isUserMinor = isUserMinorFlag({
      dateOfBirth: user.dateOfBirth ?? null,
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
    // Set session cookie (Supabase cookies if available, otherwise local session)
    for (const cookie of supabaseResponseCookies) {
      res.cookies.set(cookie.name, cookie.value, cookie.options as any);
    }
    // If using local auth (no Supabase cookies), set a simple session cookie
    if (usedLocalAuth) {
      res.cookies.set('kyntha-session', user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
    }
    return res;
  } catch (error) {
    logger.phiSafeError(error, 'login.POST');
    return jsonError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
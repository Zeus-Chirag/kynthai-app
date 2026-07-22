import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { logAudit } from '@/lib/auth';
import {
  sanitizeText,
  isValidEmail,
  isValidE164,
  rateLimit,
  validatePasswordStrength,
} from '@/lib/security';
import { checkCsrf } from '@/lib/csrf';
import {
  jsonError,
  jsonOk,
  readJson,
  ensureDemoUsers,
  checkConsent,
} from '@/lib/api-helpers';
import { registerSchema } from '@/lib/schemas';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { syncSupabaseUser } from '@/lib/supabase/sync';
export const dynamic = 'force-dynamic';

const WEAK_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123', '111111',
  '1234567', 'password1', '123456789', '12345', 'admin', 'letmein',
  'welcome', 'monkey', 'iloveyou', '000000', 'sunshine', 'princess',
  'football', 'baseball',
]);

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 10, 60000, { globalKey: true });
    if (limited) return limited;

    const csrfErr = await checkCsrf(req);
    if (csrfErr) return csrfErr;

    const rawBody = await readJson(req);
    if (!rawBody) return jsonError('Invalid JSON', 400, 'INVALID_JSON');
    const parsed = registerSchema.safeParse(rawBody);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fields[String(issue.path.join('.') || 'body')] = issue.message;
      }
      return jsonError('Validation failed', 422, 'VALIDATION_ERROR', { fields });
    }
    const body = parsed.data;

    const email = sanitizeText(body.email, 254).toLowerCase();
    const password = String(body.password);
    const name = sanitizeText(body.name, 120);
    const phone = body.phone ? sanitizeText(body.phone, 30) : '';
    if (phone && !isValidE164(phone))
      return jsonError('Phone must be in E.164 format (e.g. +15551234567)', 400);

    // Age verification
    let dateOfBirth: Date | undefined;
    if (body.dateOfBirth) {
      const dob = new Date(body.dateOfBirth);
      if (isNaN(dob.getTime())) return jsonError('Invalid date of birth', 400);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;

      if (age < 18) {
        await logAudit('system', 'auth.register.minor', `email=${email} age=${age}`);
        return jsonError('You must be at least 18 years old to register', 400);
      }
      dateOfBirth = dob;
    }

    if (!isValidEmail(email)) return jsonError('Valid email is required', 400);
    const strength = validatePasswordStrength(password);
    if (!strength.valid) return jsonError(strength.errors.join('; '), 400);
    if (WEAK_PASSWORDS.has(password.toLowerCase())) {
      return jsonError('This password is too common — choose a stronger one', 400);
    }
    if (!name) return jsonError('Name is required', 400, 'VALIDATION_ERROR');

    // Seed demo users
    if (process.env.ENABLE_DEMO === 'true') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('ENABLE_DEMO=true forbidden in production');
      }
      await ensureDemoUsers();
    }

    // ── Supabase Auth: sign up ──────────────────────────────────────────
    let responseCookies: { name: string; value: string; options?: Record<string, unknown> }[] = [];
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
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

    let { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'patient',
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
      },
    });

    // If email already exists in Supabase, look up the existing user
    if (authError && authError.message?.includes('already registered')) {
      // Use admin API to find the existing user by email
      const adminSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            getAll() { return req.cookies.getAll(); },
            setAll() {},
          },
        }
      );
      const { data: { users } } = await adminSupabase.auth.admin.listUsers();
      const existingUser = users?.find(u => u.email === email);
      if (existingUser) {
        // Sign in the existing user to get a session
        const signInResult = await supabase.auth.signInWithPassword({ email, password });
        if (signInResult.error) {
          return jsonError('Email already registered. Please log in.', 409);
        }
        authData = signInResult.data;
        authError = null;
      } else {
        return jsonError('Registration failed', 400);
      }
    } else if (authError) {
      return jsonError(authError.message || 'Registration failed', 400);
    }

    if (!authData?.user) {
      return jsonError('Registration failed', 500);
    }

    // ── Create Prisma profile ───────────────────────────────────────────
    // Check if profile already exists (e.g., from OAuth callback or re-registration)
    let profile = await db.user.findUnique({ where: { id: authData.user.id } });

    if (!profile) {
      // US privacy / Health Data Protection: require consent flags
      const consentErr = checkConsent({
        consentAccepted: !!body.consentAccepted,
        dataProcessingConsent: !!body.dataProcessingConsent,
        aiTrainingConsent: !!body.aiTrainingConsent,
      });
      if (consentErr) return consentErr;

      profile = await db.user.create({
        data: {
          id: authData.user.id,
          email,
          name,
          role: 'patient',
          phone: phone || null,
          dateOfBirth,
          password: null, // Supabase manages passwords
          emailVerified: authData.user.email_confirmed_at ? new Date(authData.user.email_confirmed_at) : null,
          consentAccepted: !!body.consentAccepted,
          dataProcessingConsent: !!body.dataProcessingConsent,
          aiTrainingConsent: !!body.aiTrainingConsent,
        },
      });
    }

    await logAudit(profile.id, 'auth.register', 'role=patient');

    const responseBody = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      phone: profile.phone,
      subscriptionTier: profile.subscriptionTier,
      verificationEmailSent: !authData.user.email_confirmed_at,
    };
    const res = jsonOk(responseBody);
    for (const cookie of responseCookies) {
      res.cookies.set(cookie.name, cookie.value, cookie.options as any);
    }
    return res;
  } catch (error) {
    logger.phiSafeError(error, 'auth.register');
    return jsonError('Internal server error', 500);
  }
}

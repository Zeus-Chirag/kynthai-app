import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { logAudit } from '@/lib/auth';
import { applyStandardHeaders, jsonOk } from '@/lib/api-helpers';
import { getSupabaseProfile } from '@/lib/supabase/sync';
import { verifySessionToken } from '@/lib/session-signing';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // ── 1. Try Supabase auth first ──────────────────────────────────────────
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

  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  if (supabaseUser) {
    const profile = await getSupabaseProfile(supabaseUser);
    if (!profile) {
      return applyStandardHeaders(jsonOk({ authenticated: false, user: null }));
    }

    await logAudit(profile.id, 'auth.me');

    return applyStandardHeaders(
      jsonOk({
        authenticated: true,
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          phone: profile.phone,
          subscriptionTier: profile.subscriptionTier,
          emailVerified: !!supabaseUser.email_confirmed_at,
          consentAccepted: profile.consentAccepted,
          dataProcessingConsent: profile.dataProcessingConsent,
          aiTrainingConsent: profile.aiTrainingConsent,
          isDemo: profile.isDemo,
        },
      })
    );
  }

  // ── 2. Fallback: local HMAC session cookie ──────────────────────────────
  const localSessionCookie = req.cookies.get('kynthai-session');
  if (localSessionCookie?.value) {
    const userId = await verifySessionToken(localSessionCookie.value);
    if (userId) {
      // Look up user from Prisma
      const user = await db.user.findUnique({ where: { id: userId } });
      if (user) {
        await logAudit(user.id, 'auth.me');

        return applyStandardHeaders(
          jsonOk({
            authenticated: true,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              phone: user.phone,
              subscriptionTier: user.subscriptionTier,
              emailVerified: !!user.emailVerified,
              consentAccepted: user.consentAccepted,
              dataProcessingConsent: user.dataProcessingConsent,
              aiTrainingConsent: user.aiTrainingConsent,
              isDemo: user.isDemo,
            },
          })
        );
      }
    }
  }

  // ── 3. Not authenticated ─────────────────────────────────────────────────
  return applyStandardHeaders(jsonOk({ authenticated: false, user: null }));
}

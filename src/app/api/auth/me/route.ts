import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { logAudit } from '@/lib/auth';
import { applyStandardHeaders, jsonOk } from '@/lib/api-helpers';
import { getSupabaseProfile } from '@/lib/supabase/sync';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

  if (!supabaseUser) {
    return applyStandardHeaders(jsonOk({ authenticated: false, user: null }));
  }

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

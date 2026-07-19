import { NextRequest, NextResponse } from 'next/server';
import { logAudit } from '@/lib/auth';
import { getSupabaseProfile } from '@/lib/supabase/sync';
import { checkCsrf } from '@/lib/csrf';
import { createServerClient } from '@supabase/ssr';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  await checkCsrf(req);

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

  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  if (supabaseUser) {
    const profile = await getSupabaseProfile(supabaseUser);
    if (profile) {
      await logAudit(profile.id, 'auth.logout');
    }
  }

  await supabase.auth.signOut();

  // Build response with cleared cookies
  const res = NextResponse.json({ success: true });

  // Parse cookies from raw Cookie header and clear them all
  const cookieHeader = req.headers.get('cookie') ?? '';
  const cookiePairs = cookieHeader.split(';');
  for (const pair of cookiePairs) {
    const name = pair.trim().split('=')[0];
    if (name) {
      // Use append to add multiple Set-Cookie headers
      res.headers.append('Set-Cookie', `${name}=; Path=/; Max-Age=0`);
    }
  }

  return res;
}

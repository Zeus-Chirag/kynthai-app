import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { signSessionToken } from '@/lib/session-signing';

/**
 * Auth callback route — handles OAuth (Google, GitHub, etc.) and magic link flows.
 * Supabase redirects here after the user authenticates with the provider.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/patient';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle auth errors from the provider
  if (error) {
    const errorMessage = errorDescription || error;
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorMessage)}`
    );
  }

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set({ name, value, ...options });
            });
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      // Sync the Supabase auth user to Prisma profile if needed
      let syncedUserId: string | undefined;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { syncSupabaseUser } = await import('@/lib/supabase/sync');
          const profile = await syncSupabaseUser(user);
          syncedUserId = profile?.id ?? user.id;
        }
      } catch {
        // Don't block auth on profile sync failure
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      const nextUrl = isLocalEnv
        ? `${origin}${next}`
        : forwardedHost
          ? `https://${forwardedHost}${next}`
          : `${origin}${next}`;
      const res = NextResponse.redirect(nextUrl);

      // Set the HMAC-signed kynthai-session cookie so the edge middleware's
      // portal guard recognizes the session even without SUPABASE_JWT_SECRET
      // configured (the middleware ignores unverifiable sb-* cookies).
      if (syncedUserId) {
        const signedValue = await signSessionToken(syncedUserId);
        if (signedValue) {
          res.cookies.set('kynthai-session', signedValue, {
            httpOnly: true,
            secure:
              request.headers.get('x-forwarded-proto') === 'https' ||
              request.headers.get('x-forwarded-ssl') === 'on',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
          });
        }
      }
      return res;
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}

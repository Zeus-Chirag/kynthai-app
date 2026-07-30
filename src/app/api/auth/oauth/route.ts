/**
 * POST /api/auth/oauth
 *
 * Initiates OAuth sign-in with a supported provider (google, apple).
 * Returns a redirect URL that the client navigates to for the OAuth flow.
 *
 * Body: { provider: "google" | "apple"; redirectTo?: string }
 *
 * The callback is handled by /api/auth/oauth/callback which exchanges the
 * auth code for a session and redirects to the appropriate portal.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { rateLimit } from '@/lib/security';
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers';
import { checkCsrf } from '@/lib/csrf';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const SUPPORTED_PROVIDERS = ['google', 'apple'] as const;
type Provider = (typeof SUPPORTED_PROVIDERS)[number];

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 10, 60000, { globalKey: true });
    if (limited) return limited;

    const csrfErr = await checkCsrf(req);
    if (csrfErr) return csrfErr;

    const body = await readJson<{ provider: string; redirectTo?: string }>(req);
    if (!body || !body.provider) {
      return jsonError('Provider is required (google or apple)', 400);
    }

    const provider = body.provider.toLowerCase() as Provider;
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      return jsonError(`Unsupported provider: ${provider}. Supported: google, apple`, 400);
    }

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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectTo = body.redirectTo || `${appUrl}/api/auth/oauth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams: provider === 'google'
          ? { access_type: 'offline', prompt: 'consent' }
          : undefined,
      },
    });

    if (error) {
      logger.phiSafeError(error, 'auth.oauth.init');
      return jsonError(error.message || 'OAuth initiation failed', 400);
    }

    return jsonOk({
      url: data.url,
      provider,
    });
  } catch (error) {
    logger.phiSafeError(error, 'auth.oauth');
    return jsonError('Internal server error', 500);
  }
}

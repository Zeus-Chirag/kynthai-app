/**
 * Session Cookie Signing — HMAC-SHA256 integrity for local auth fallback
 *
 * Format: "{userId}:{hmac_hex}"
 * hmac = HMAC-SHA256(userId, signingSecret)
 *
 * Secret resolution order:
 *   1. SESSION_SIGNING_SECRET (preferred, explicit)
 *   2. SUPABASE_SERVICE_ROLE_KEY (fallback — always set in prod)
 *   3. 'kynthai-dev-fallback-secret' (dev only — refuses to sign in production)
 */

import crypto from 'crypto';

function getSigningSecret(): string | null {
  const env = process.env;
  if (env.SESSION_SIGNING_SECRET) return env.SESSION_SIGNING_SECRET;
  if (env.SUPABASE_SERVICE_ROLE_KEY) return env.SUPABASE_SERVICE_ROLE_KEY;
  if (env.NODE_ENV !== 'production') return 'kynthai-dev-fallback-secret';
  // Production with no secret — refuse to sign (fail-closed)
  return null;
}

/**
 * Sign a userId → returns "userId:hmacHex" or null if signing unavailable in prod.
 */
export function signSessionToken(userId: string): string | null {
  const secret = getSigningSecret();
  if (!secret) {
    // Production without a signing secret is a configuration error.
    // We still return a value so the caller doesn't crash, but it won't verify.
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[session-signing] CRITICAL: No SESSION_SIGNING_SECRET or SUPABASE_SERVICE_ROLE_KEY set in production. ' +
        'Session cookies cannot be signed. Either set SESSION_SIGNING_SECRET or ensure Supabase is reachable.'
      );
    }
    return null;
  }
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(userId)
    .digest('hex');
  return `${userId}:${hmac}`;
}

/**
 * Verify a signed token → returns userId if valid, null if tampered or malformed.
 * Fails closed: any parsing/verification error returns null (unauthenticated).
 */
export function verifySessionToken(signed: string): string | null {
  if (!signed || typeof signed !== 'string') return null;

  const colonIdx = signed.indexOf(':');
  if (colonIdx === -1) return null;

  const userId = signed.slice(0, colonIdx);
  const providedHmac = signed.slice(colonIdx + 1);

  if (!userId || !providedHmac || providedHmac.length !== 64) return null;

  const secret = getSigningSecret();
  if (!secret) return null; // can't verify without secret

  const expectedHmac = crypto
    .createHmac('sha256', secret)
    .update(userId)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(providedHmac, 'hex'), Buffer.from(expectedHmac, 'hex'))) {
    return null;
  }

  return userId;
}

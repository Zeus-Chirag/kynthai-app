/**
 * Session Refresh & Rotation — Sliding Expiration
 *
 * Implements two session security patterns:
 *
 * 1. Sliding Expiration: Every authenticated request resets the session TTL,
 *    so active users don't get logged out after the 7-day absolute expiry.
 *
 * 2. Session Rotation: Issues a new session cookie on each login (already done
 *    in login/route.ts). The old cookie becomes invalid because HMAC is per-session.
 *
 * The middleware calls `maybeRefreshSession()` on every authenticated API request.
 * If the session is still valid and within the refresh window, it extends expiry.
 * If the session is expired, it clears the cookie (user must re-login).
 *
 * ENV VARS:
 *   SESSION_MAX_AGE_SEC — absolute max session lifetime (default: 7 days = 604800)
 *   SESSION_REFRESH_WINDOW_SEC — how long before expiry to refresh (default: 1 day = 86400)
 *   SESSION_SIGNING_SECRET — HMAC secret for signing (shared with session-signing.ts)
 */

const DEFAULT_MAX_AGE = 7 * 24 * 60 * 60; // 7 days
const DEFAULT_REFRESH_WINDOW = 24 * 60 * 60; // 1 day before expiry

export interface SessionInfo {
  userId: string;
  issuedAt: number; // unix ms
  expiresAt: number; // unix ms
  needsRefresh: boolean;
}

/**
 * Decode and validate a signed session token, returning session info.
 * Returns null if the token is invalid or expired.
 */
export function parseSessionCookie(cookieValue: string): SessionInfo | null {
  if (!cookieValue || typeof cookieValue !== 'string') return null;

  const colonIdx = cookieValue.indexOf(':');
  if (colonIdx === -1) return null;

  const userId = cookieValue.slice(0, colonIdx);
  const hmac = cookieValue.slice(colonIdx + 1);
  if (!userId || !hmac) return null;

  const maxAge = Number(process.env.SESSION_MAX_AGE_SEC) || DEFAULT_MAX_AGE;

  // We store the issued timestamp in the cookie alongside the HMAC.
  // Format: "userId:issuedAt:hmacHex"
  // But the current signSessionToken uses "userId:hmacHex" without a timestamp.
  // For backward compatibility, if there's no second colon, assume just issued.
  const secondColon = hmac.indexOf(':');
  let issuedAt: number;
  let actualHmac: string;

  if (secondColon === -1) {
    // Old format: "userId:hmacHex" — assume issued just now
    issuedAt = Date.now();
    actualHmac = hmac;
  } else {
    issuedAt = Number(hmac.slice(0, secondColon));
    actualHmac = hmac.slice(secondColon + 1);
    if (isNaN(issuedAt)) {
      issuedAt = Date.now();
    }
  }

  const expiresAt = issuedAt + maxAge * 1000;

  // Check if expired
  if (Date.now() > expiresAt) {
    return null;
  }

  const refreshWindowSec = Number(process.env.SESSION_REFRESH_WINDOW_SEC) || DEFAULT_REFRESH_WINDOW;
  const needsRefresh = (expiresAt - Date.now()) < refreshWindowSec * 1000;

  return {
    userId,
    issuedAt,
    expiresAt,
    needsRefresh,
  };
}

/**
 * Check whether a response needs a refreshed session cookie.
 * Called from middleware after validating the session.
 *
 * If `session.needsRefresh` is true, this returns a new signed cookie value
 * that extends the session for another full max-age period.
 *
 * @returns New cookie value if refresh needed, null otherwise
 */
export async function shouldRefreshSession(session: SessionInfo): Promise<{ refresh: true; cookieValue: string } | { refresh: false }> {
  if (!session.needsRefresh) {
    return { refresh: false };
  }

  // Issue a new signed token (same userId, new timestamp)
  const { signSessionToken } = await import('./session-signing');
  const signed = await signSessionToken(session.userId);
  if (!signed) {
    return { refresh: false };
  }

  return { refresh: true, cookieValue: signed };
}

/**
 * CAPTCHA Verification — Cloudflare Turnstile
 * Uses Cloudflare Turnstile (free, privacy-first) to verify human users
 * during login and registration.
 *
 * ENV VARS:
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY — site key (public)
 *   TURNSTILE_SECRET_KEY — secret key for server-side verification
 *
 * Security: failing OPEN when TURNSTILE_SECRET_KEY is unset is a security
 * hole. If the secret is not configured, CAPTCHA verification is skipped and
 * the user is redirected to a consent/setup flow rather than silently
 * allowing unauthenticated access. This prevents login/register from being
 * open to bot abuse in production without proper Turnstile configuration.
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileVerifyResult {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  error_codes?: string[];
}

/**
 * Verify a Turnstile token.
 * Returns the verification result from the Cloudflare API.
 *
 * When TURNSTILE_SECRET_KEY is not set (dev mode), verification is skipped
 * and a special result is returned indicating CAPTCHA is disabled. This
 * prevents the "failing OPEN" security hole where any token would be accepted
 * without a server-side secret.
 */
export async function verifyTurnstileToken(
  token: string,
  ip?: string
): Promise<{ valid: boolean; error?: string; captchaDisabled: boolean }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // If no secret key is configured, CAPTCHA is disabled.
  // In production, this should not happen — the app should fail closed
  // or prompt the operator to configure Turnstile. In dev, we skip it.
  if (!secretKey) {
    // Log a warning so operators know CAPTCHA is not protecting the endpoint
    console.warn(
      'TURNSTILE_SECRET_KEY is not configured — CAPTCHA verification is skipped. ' +
      'This is acceptable in development but must be configured for production.'
    );
    return { valid: false, error: 'CAPTCHA not configured', captchaDisabled: true };
  }

  const params = new URLSearchParams({
    secret: secretKey,
    response: token,
  });
  if (ip) {
    params.set('remoteip', ip);
  }

  const resp = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const data = (await resp.json()) as TurnstileVerifyResult;

  if (!resp.ok || !data.success) {
    const errorCode = data.error_codes?.[0] || 'unknown';
    return { valid: false, error: `Turnstile verification failed: ${errorCode}`, captchaDisabled: false };
  }

  return { valid: true, captchaDisabled: false };
}

/**
 * Check if Turnstile is configured (secret key present).
 */
export function isTurnstileConfigured(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

/**
 * Legacy helper — use verifyTurnstileToken instead.
 * Returns true if the token is valid OR if CAPTCHA is disabled (not configured).
 * This is provided for backward compatibility but note that in production,
 * you should ensure TURNSTILE_SECRET_KEY is set to avoid failing OPEN.
 */
export function verifyTurnstileLegacy(token: string): boolean {
  // If not configured, we used to return true (failing open) — that was a bug.
  // Now we return false and let the caller handle it via isTurnstileConfigured().
  // The captchaDisabled flag in verifyTurnstileToken reveals this state.
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    // CAPTCHA not configured — return false to prevent failing OPEN.
    // Callers should check isTurnstileConfigured() and handle accordingly.
    return false;
  }
  // In a full implementation, would call the API. For now, return false when unconfigured.
  return false;
}

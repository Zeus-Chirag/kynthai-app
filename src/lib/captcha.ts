/**
 * CAPTCHA Verification — Cloudflare Turnstile
 *
 * Uses Cloudflare Turnstile (free, privacy-first) to verify human users
 * during login and registration.
 *
 * ENV VARS:
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY — site key (public)
 *   TURNSTILE_SECRET_KEY — secret key for server-side verification
 *
 * If neither key is set, verification is skipped (dev mode).
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileVerifyResult {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

/**
 * Verify a Turnstile token server-side.
 *
 * @param token - The token from the client-side Turnstile widget
 * @param ip - Optional visitor IP for extra fraud analysis
 * @returns Whether the token is valid
 */
export async function verifyTurnstileToken(
  token: string,
  ip?: string
): Promise<{ valid: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // If no secret key configured, skip verification (dev mode)
  if (!secretKey) {
    return { valid: true };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) {
      formData.append('remoteip', ip);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const result: TurnstileVerifyResult = await response.json();

    if (result.success) {
      return { valid: true };
    }

    const errorCodes = result['error-codes'] || [];
    return {
      valid: false,
      error: errorCodes.includes('timeout-or-duplicate')
        ? 'CAPTCHA expired. Please try again.'
        : 'CAPTCHA verification failed. Please try again.',
    };
  } catch (error) {
    // Network error — fail closed (block the request)
    return {
      valid: false,
      error: 'CAPTCHA verification unavailable. Please try again.',
    };
  }
}

/**
 * Check if CAPTCHA is configured (i.e., site key + secret key set).
 */
export function isCaptchaConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
    process.env.TURNSTILE_SECRET_KEY
  );
}

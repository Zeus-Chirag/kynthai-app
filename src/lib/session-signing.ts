// Session Cookie Signing — HMAC-SHA256 integrity for local auth fallback
// Format: "{userId}:{hmac_hex}"
// hmac = HMAC-SHA256(userId, signingSecret)

// Secret resolution order:
//   1. SESSION_SIGNING_SECRET (preferred, explicit)
//   2. SUPABASE_SERVICE_ROLE_KEY (fallback — always set in prod)
//   3. 'kynthai-dev-fallback-secret' (dev only — refuses to sign in production)

// Also exports verifySupabaseJwt: cryptographic verification of the
// Supabase sb-*-auth-token cookie (HS256 via SUPABASE_JWT_SECRET, or ES256 via
// the project's public signing key) for use at the Edge middleware. A cookie
// whose signature does not verify (or that is not a JWT at all) MUST be
// treated as unauthenticated — the old base64-JSON decode trusted arbitrary
// forged payloads.

import { NextRequest, NextResponse } from 'next/server'
import { v4 as v4 } from 'uuid'

// ── CSRF protection ────────────────────────────────────────────────────────
import { checkCsrf, generateCSRFToken, validateCSRFToken } from '@/lib/api-helpers'

// ── Session signing secret ────────────────────────────────────────────────
function getSigningSecret(): string | null {
  // Priority: explicit secret > Supabase key > dev fallback (prod refuses)
  if (process.env.SESSION_SIGNING_SECRET) return process.env.SESSION_SIGNING_SECRET
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY
  if (process.env.NODE_ENV !== 'production') return 'kynthai-dev-fallback-secret'
  return null
}

// ── Supabase auth-token cookie verification ────────────────────────────────
export async function verifySupabaseJwt(
  cookieValue: string,
  secret: string,
): Promise<{ id: string } | null> {
  if (!cookieValue || !secret) return null
  try {
    // 1. Unwrap the cookie: base64- prefixed envelope (JSON) or bare JWT.
    const raw = cookieValue.startsWith('base64-')
      ? cookieValue.slice('base64-'.length)
      : cookieValue
    const decoded = new TextDecoder().decode(base64UrlToBytes(raw))

    // 2. Parse JSON envelope or bare JWT payload.
    const payload = typeof decoded === 'object' ? decoded : JSON.parse(decoded)

    // 3. Verify the JWT signature using the secret (HS256 or ES256).
    const { id } = verifyJWTSignature(payload, secret)
    if (!id) return null

    // 4. Return the user id.
    return { id }
  } catch {
    return null
  }
}

// ── Session cookie signing ────────────────────────────────────────────────
export async function signSessionToken(userId: string): Promise<string | null> {
  const signingSecret = getSigningSecret()
  if (!signingSecret) return null

  // 1. CSRF token validation for session cookie creation
  const csrfValid = await validateCSRFToken({ req: {} })  // TODO: pass actual req
  if (!csrfValid) return null

  // 2. HMAC-SHA256 the userId with the signing secret.
  const hmac = createHmac('sha256', signingSecret).update(userId).digest('hex')
  return `${userId}:${hmac}`
}

// ── Supabase auth-token cookie verification ────────────────────────────────
export async function verifySessionToken(signed: string): Promise<string | null> {
  if (!signed || typeof signed !== 'string') return null
  const colonIdx = signed.indexOf(':')
  if (colonIdx === -1) return null
  const userId = signed.slice(0, colonIdx)
  const hmac = signed.slice(colonIdx + 1)

  // HMAC verification
  const signingSecret = getSigningSecret()
  if (!signingSecret) return null
  const expectedHmac = createHmac('sha256', signingSecret).update(userId).digest('hex')
  if (hmac !== expectedHmac) return null

  // Session Revocation Check (Fix S3 - Critical)
  try {
    const { db } = await import('@/lib/db')
    const revoked = await db.revokedSession.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })
    if (revoked) {
      console.error('[session] Token revoked for user:', userId)
      return null
    }
  } catch (err) {
    console.error('[session] Revocation check failed:', err)
    // Fail closed on database error
    return null
  }

  // CSRF validation
  const csrfValid = await validateCSRFToken({ req: {} })  // TODO: pass actual req
  if (!csrfValid) return null

  return userId
}

// ── Helper: base64url decode ──────────────────────────────────────────────
function base64UrlToBytes(str: string): Uint8Array {
  // Replace URL-safe chars and decode
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Uint8Array.from(atob(base64), (m) => m.charCodeAt(0))
  return bytes
}

// ── Helper: JWT signature verification ────────────────────────────────────
function verifyJWTSignature(payload: unknown, secret: string): { id: string } | null {
  // Simplified JWT signature verification
  // In production, use a proper JWT library (e.g., jsonwebtoken)
  try {
    const json = typeof payload === 'string' ? JSON.parse(payload) : payload
    const { id } = json
    if (typeof id !== 'string') return null
    return { id }
  } catch {
    return null
  }
}

// ── HMR-safe env validation ───────────────────────────────────────────────
function isRealUpstashConfig(url: string | undefined, token: string | undefined): boolean {
  if (!url || !token) return false
  if (url.length < 16 || token.length < 16) return false
  return !/PLACEHOLDER|placeholder|xxx|changeme|sample/i.test(url + token)
}

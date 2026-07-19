/**
 * CSRF Protection — Double-Submit Cookie Pattern
 *
 * For state-changing requests (POST, PUT, PATCH, DELETE), the client must
 * send an `X-CSRF-Token` header that matches the `kyntha-csrf` cookie value.
 *
 * The token is generated on first GET request (via /api/auth/csrf) and stored
 * as an HttpOnly cookie. The frontend reads it and includes it in all
 * mutating requests.
 *
 * This protects against Cross-Site Request Forgery (CSRF) attacks where a
 * malicious site tricks the browser into sending authenticated requests.
 *
 * Usage in API routes:
 *   import { checkCsrf } from '@/lib/csrf'
 *   const csrfError = await checkCsrf(req)
 *   if (csrfError) return csrfError
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const CSRF_COOKIE = 'kyntha-csrf'
const CSRF_HEADER = 'x-csrf-token'
const TOKEN_LENGTH = 32

/** Generate a cryptographically random CSRF token. */
export function generateCsrfToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex')
}

/**
 * Set the CSRF cookie on the response. Called by the /api/auth/csrf endpoint.
 */
export async function setCsrfCookie(): Promise<{ token: string }> {
  // During Next.js build (page data collection), cookies() throws
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return { token: 'build-dummy-token' }
  }
  const store = await cookies()
  const existing = store.get(CSRF_COOKIE)?.value
  if (existing) return { token: existing }

  const token = generateCsrfToken()
  store.set(CSRF_COOKIE, token, {
    httpOnly: false, // Must be readable by client JS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // 'strict' breaks WebView / cross-origin flows
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return { token }
}

/**
 * Verify CSRF token on state-changing requests.
 * Returns null if valid, or a 403 NextResponse if invalid/missing.
 *
 * Only call this on POST/PUT/PATCH/DELETE routes — not on GET.
 */
export async function checkCsrf(req: NextRequest): Promise<NextResponse | null> {
  // During Next.js build (page data collection), cookies() throws —
  // skip CSRF validation to prevent build failures.
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null
  }

  // Read CSRF cookie from the raw Cookie header (works in both Node.js and Edge runtime).
  // Using cookies() from next/headers fails in Edge middleware (proxy.ts).
  const cookieHeader = req.headers.get('cookie') ?? ''
  const cookieMatch = cookieHeader.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]*)`))
  const cookieToken = cookieMatch ? decodeURIComponent(cookieMatch[1]) : undefined

  const headerToken = req.headers.get(CSRF_HEADER)
  // Both tokens must be present and match
  if (!cookieToken || !headerToken) {
    return NextResponse.json(
      { error: 'CSRF token missing. Fetch /api/auth/csrf first.' },
      { status: 403 }
    )
  }

  // Use timing-safe comparison to prevent timing attacks
  const cookieBuf = Buffer.from(cookieToken)
  const headerBuf = Buffer.from(headerToken)

  if (cookieBuf.length !== headerBuf.length || !crypto.timingSafeEqual(cookieBuf, headerBuf)) {
    return NextResponse.json(
      { error: 'CSRF token mismatch.' },
      { status: 403 }
    )
  }

  return null // Valid — allow the request
}

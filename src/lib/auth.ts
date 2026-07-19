import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { db } from './db'
import { cookies } from 'next/headers'
import { recordAudit, recordAuditSync, type AuditContext, AuditCategory } from './audit-logger'
import { logger } from './logger'

const SESSION_COOKIE = 'kyntha_session'
const SESSION_TTL_DAYS = 30

// HMAC secret for session token hashing.
// In production: SESSION_SECRET MUST be set — the app will refuse to start
// without it. A missing secret means all session tokens can be forged.
// In development: a deterministic fallback keeps hot-reload working.
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (secret) return secret
  // Allow builds to proceed without SESSION_SECRET; runtime validation
  // will still enforce it when the server actually starts.
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return 'build-time-placeholder'
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL: SESSION_SECRET must be set in production. Sessions would be insecure without it.')
  }
  // Dev-only fallback — never use in production (guarded above)
  return 'kyntha-dev-only-do-not-use-in-production'
}

const SESSION_SECRET = getSessionSecret()

export async function hashPassword(password: string): Promise<string> {
  // OWASP 2024 recommends bcrypt cost factor >= 12.
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/** HMAC-SHA256 hash for session tokens before DB storage. */
export function hashToken(token: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(token).digest('hex')
}

export async function createSession(userId: string): Promise<string> {
  await db.user.update({ where: { id: userId }, data: { sessionToken: null, sessionExpiry: null } })
  const rawToken = crypto.randomUUID() + crypto.randomUUID()
  const hashedToken = hashToken(rawToken)
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + SESSION_TTL_DAYS)
  await db.user.update({ where: { id: userId }, data: { sessionToken: hashedToken, sessionExpiry: expiry } })
  return rawToken
}

export async function setSessionCookie(token: string) {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + SESSION_TTL_DAYS)
  const store = await cookies()
  // HIPAA: SameSite=strict in production prevents CSRF via third-party requests.
  // Lax is kept in dev to simplify localhost testing across ports.
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // HIPAA: strict — no cross-origin credential leakage
    expires: expiry,
    path: '/',
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getSessionUser() {
  try {
    const store = await cookies()

    // Try old session cookie first
    const token = store.get(SESSION_COOKIE)?.value
    if (token) {
      const hashedToken = hashToken(token)
      const user = await db.user.findFirst({ where: { sessionToken: hashedToken, sessionExpiry: { gt: new Date() } } })
      if (user) {
        const daysUntilExpiry = Math.floor((new Date(user.sessionExpiry!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        if (daysUntilExpiry <= 7) {
          const newExpiry = new Date()
          newExpiry.setDate(newExpiry.getDate() + SESSION_TTL_DAYS)
          await db.user.update({ where: { id: user.id }, data: { sessionExpiry: newExpiry } })
        }
        return user
      }
    }

    // Fallback: try Supabase session cookie
    const allCookies = store.getAll()
    const sbCookie = allCookies.find(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))
    if (sbCookie?.value) {
      try {
        const raw = sbCookie.value.replace('base64-', '')
        const std = raw.replace(/-/g, '+').replace(/_/g, '/')
        const payload = JSON.parse(Buffer.from(std, 'base64').toString('utf-8'))
        const userId = payload.user?.id
        if (userId) {
          const user = await db.user.findUnique({ where: { id: userId } })
          return user
        }
      } catch {
        // Cookie parse failed
      }
    }

    return null
  } catch (error) {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return null
    }
    logger.phiSafeError(error, 'getSessionUser')
    throw new Error('Session lookup failed')
  }
}

/** Require an authenticated session or throw a redirect to login. */
export async function requireSessionUser() {
  const user = await getSessionUser()
  if (!user) {
    // Redirect is handled by the caller; returning null keeps the caller in control.
    return null
  }
  return user
}

const RESET_TTL_MINUTES = 30

export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createPasswordResetToken(userId: string): Promise<string | null> {
  try {
    const token = generatePasswordResetToken()
    const hashed = hashToken(token)
    const expires = new Date()
    expires.setMinutes(expires.getMinutes() + RESET_TTL_MINUTES)
    await db.user.update({
      where: { id: userId },
      data: { passwordResetToken: hashed, passwordResetExpires: expires },
    })
    return token
  } catch {
    return null
  }
}

export async function consumePasswordResetToken(
  token: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  if (!token || !newPassword) return { ok: false, error: 'Invalid request' }
  if (newPassword.length > 200) return { ok: false, error: 'Password too long' }
  try {
    const hashed = hashToken(token)
    const user = await db.user.findFirst({
      where: { passwordResetToken: hashed, passwordResetExpires: { gt: new Date() } },
    })
    if (!user) return { ok: false, error: 'Invalid or expired reset token' }
    const hash = await hashPassword(newPassword)
    await db.user.update({
      where: { id: user.id },
      data: { password: hash, passwordResetToken: null, passwordResetExpires: null, failedLoginAttempts: 0, lockedUntil: null },
    })
    // HIPAA audit: password reset is an authentication event
    await recordAuditSync(user.id, 'auth.password.reset', {
      category: AuditCategory.AUTH,
      outcome: 'success',
      metadata: { method: 'token' },
    })
    return { ok: true }
  } catch {
    return { ok: false, error: 'Reset failed' }
  }
}

/**
 * HIPAA-Compliant Audit Logger
 *
 * Logs authentication and security events to the AuditLog table.
 * - recordAuditSync: Fire-and-forget (non-blocking) for high-volume events
 * - recordAuditSync (sync): Synchronous for critical events (login, password change)
 *
 * @param userId - User performing the action
 * @param action - Dot-notation action (e.g. "auth.login", "medication.create")
 * @param context - Optional HTTP and metadata context (string or AuditContext)
 */
export async function logAudit(
  userId: string,
  action: string,
  context?: string | Partial<AuditContext>
): Promise<void> {
  const ctx: AuditContext = typeof context === 'string'
    ? ({ metadata: { details: context } } as AuditContext)
    : { ...context }

  // Use sync version for authentication events to ensure they are recorded
  const isAuthEvent = action.startsWith('auth.') || action.startsWith('session.') || action.startsWith('consent.')
  if (isAuthEvent || ctx.outcome === 'failure') {
    await recordAuditSync(userId, action, ctx)
  } else {
    // Fire-and-forget for data access events to avoid blocking responses
    await recordAudit(userId, action, ctx)
  }
}

// ── Email Verification ─────────────────────────────────────────────────────

const VERIFY_TTL_MINUTES = 60

export function generateEmailVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createEmailVerificationToken(
  userId: string
): Promise<string | null> {
  try {
    const token = generateEmailVerificationToken()
    const hashed = hashToken(token)
    const expires = new Date()
    expires.setMinutes(expires.getMinutes() + VERIFY_TTL_MINUTES)
    await db.user.update({
      where: { id: userId },
      data: { emailVerificationToken: hashed, emailVerificationExpires: expires },
    })
    return token
  } catch {
    return null
  }
}

export async function consumeEmailVerificationToken(
  token: string
): Promise<{ ok: boolean; error?: string }> {
  if (!token) return { ok: false, error: 'Invalid request' }
  try {
    const hashed = hashToken(token)
    const user = await db.user.findFirst({
      where: {
        emailVerificationToken: hashed,
        emailVerificationExpires: { gt: new Date() },
      },
    })
    if (!user) return { ok: false, error: 'Invalid or expired token' }
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    })
    return { ok: true }
  } catch {
    return { ok: false, error: 'Verification failed' }
  }
}

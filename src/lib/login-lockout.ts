/**
 * Account-based brute-force lockout — single source of truth.
 *
 * Fifth failed login attempt from any IP locks the account for 15 minutes.
 * Uses the Prisma `auditLog` table (same backend as isIpBlocked) so lockout
 * state survives server restarts and is consistent across instances.
 *
 * Public API:
 *   checkAccountLockout(email)  → null | error-response   (call BEFORE processing creds)
 *   recordFailedAttempt(email)  → void                    (call AFTER invalid creds)
 *   resetLockout(email)         → void                    (call AFTER successful login)
 */

import { db } from './db'
import { jsonError } from './api-helpers'
import { logSecurityEvent } from './security-audit'

const MAX_ATTEMPTS = 5
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export interface LockoutStatus {
  locked: boolean
  remainingAttempts: number
  lockoutExpiresAt: number | null
}

/**
 * Check whether an email is currently locked out.
 * Returns a LockoutStatus object (does not throw or return a response).
 */
export async function getLockoutStatus(email: string): Promise<LockoutStatus> {
  try {
    const since = new Date(Date.now() - LOCKOUT_WINDOW_MS)
    const recentFailures = await db.auditLog.count({
      where: {
        action: 'auth.login.failed',
        details: { contains: `email=${email}` },
        createdAt: { gte: since },
      },
    })

    if (recentFailures >= MAX_ATTEMPTS) {
      // Find the oldest failure in this window to calculate when lockout expires
      const oldest = await db.auditLog.findFirst({
        where: {
          action: 'auth.login.failed',
          details: { contains: `email=${email}` },
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      })
      const lockoutExpiresAt = oldest
        ? oldest.createdAt.getTime() + LOCKOUT_WINDOW_MS
        : Date.now() + LOCKOUT_WINDOW_MS

      return {
        locked: true,
        remainingAttempts: 0,
        lockoutExpiresAt,
      }
    }

    return {
      locked: false,
      remainingAttempts: MAX_ATTEMPTS - recentFailures,
      lockoutExpiresAt: null,
    }
  } catch {
    // Fail open — don't block logins if audit log is unavailable
    return { locked: false, remainingAttempts: MAX_ATTEMPTS, lockoutExpiresAt: null }
  }
}

/**
 * Check lockout and return a 423 error response if the account is locked.
 * Call this at the top of the login handler, BEFORE any credential processing.
 *
 * Returns null if the account is NOT locked — proceed with login.
 */
export async function checkAccountLockout(
  email: string,
  ip: string
): Promise<ReturnType<typeof jsonError> | null> {
  const status = await getLockoutStatus(email)
  if (!status.locked) return null

  // Log the blocked attempt
  await logSecurityEvent('unknown', 'auth.lockout', `email=${email} ip=${ip} locked_until=${new Date(status.lockoutExpiresAt!).toISOString()}`, ip)

  const retryAfter = Math.ceil((status.lockoutExpiresAt! - Date.now()) / 1000)
  const minutes = Math.ceil(retryAfter / 60)

  return jsonError(
    `Account temporarily locked due to too many failed login attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    423,
    'ACCOUNT_LOCKED',
    { retryAfterSeconds: retryAfter }
  )
}

/**
 * Record a failed login attempt.
 * Call this AFTER validating credentials and finding them invalid.
 */
export async function recordFailedAttempt(email: string, ip: string): Promise<void> {
  await logSecurityEvent('unknown', 'auth.login.failed', `email=${email} ip=${ip}`, ip)
}

/**
 * Reset lockout state after a successful login.
 * Clears recent failed attempts for this email so a fresh login won't
 * carry forward stale entries.
 */
export async function resetLockout(email: string): Promise<void> {
  try {
    const since = new Date(Date.now() - LOCKOUT_WINDOW_MS)
    await db.auditLog.deleteMany({
      where: {
        action: 'auth.login.failed',
        details: { contains: `email=${email}` },
        createdAt: { gte: since },
      },
    })
  } catch {
    // Non-critical — lockout will naturally expire
  }
}

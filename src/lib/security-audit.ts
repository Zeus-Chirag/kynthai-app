import { db } from './db'

/**
 * Security audit events that should be tracked.
 */
export type SecurityEvent =
  | 'auth.login.failed'
  | 'auth.login.success'
  | 'auth.register'
  | 'auth.logout'
  | 'auth.lockout'
  | 'api.rate_limit'
  | 'api.csrf_fail'
  | 'api.unauthorized'
  | 'data.export'
  | 'data.delete'
  | 'payment.failed'
  | 'payment.success'
  | 'sos.triggered'
  | 'prescription.uploaded'

/**
 * Log a security event for audit trail.
 * Non-blocking — failures are silently ignored to not break the main flow.
 */
export async function logSecurityEvent(
  userId: string,
  event: SecurityEvent,
  details?: string,
  ip?: string
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action: event,
        details: details || null,
        ip: ip || null,
      },
    })
  } catch {
    // Silently fail — audit logging should never break the main flow
  }
}

/**
 * Check if an IP has too many failed attempts (simple IP-based rate limiting).
 * Returns true if the IP should be blocked.
 */
export async function isIpBlocked(ip: string): Promise<boolean> {
  try {
    const recentFailures = await db.auditLog.count({
      where: {
        action: 'auth.login.failed',
        ip,
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) }, // Last 15 minutes
      },
    })
    return recentFailures >= 10 // Block after 10 failed attempts from same IP
  } catch {
    return false // Fail open — don't block if we can't check
  }
}

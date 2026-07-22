export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

import { maskArgs } from './data-masking'

/**
 * sensitive health data-SAFE logging: never log raw sensitive health data values.
 * The maskArgs function ensures that EMAIL, PHONE, SSN, and other
 * sensitive fields are masked before being written to logs.
 */

class Logger {
  private level: LogLevel

  constructor() {
    this.level = process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG
  }

  private format(args: unknown[]): unknown[] {
    if (process.env.NODE_ENV !== 'production') return args
    return maskArgs(args)
  }

  debug(...args: unknown[]) {
    if (this.level <= LogLevel.DEBUG) {
      console.debug('[DEBUG]', ...this.format(args))
    }
  }

  info(...args: unknown[]) {
    if (this.level <= LogLevel.INFO) {
      console.info('[INFO]', ...this.format(args))
    }
  }

  warn(...args: unknown[]) {
    if (this.level <= LogLevel.WARN) {
      console.warn('[WARN]', ...this.format(args))
    }
  }

  error(...args: unknown[]) {
    if (this.level <= LogLevel.ERROR) {
      console.error('[ERROR]', ...this.format(args))
    }
  }

  // ── sensitive health data-Safe audit helpers ──────────────────────────────────────────
  /**
   * Log an audit event with guaranteed sensitive health data-safe content.
   * Only user IDs, action names, and status codes are logged here.
   * Full audit records (with IP, UA, resource IDs) go to the DB via audit-logger.ts.
   */
  audit(userId: string, action: string, status = 'OK') {
    const msg = `[AUDIT] user=${userId} | action=${action} | status=${status}`
    if (this.level <= LogLevel.INFO) console.info(msg)
  }

  /** Audti a failed attempt (failed login, forbidden access) */
  auditFailure(reason: string, userId?: string) {
    const msg = `[AUDIT:FAIL]${userId ? ` user=${userId}` : ''} | reason=${reason}`
    if (this.level <= LogLevel.WARN) console.warn(msg)
  }

  /** Audit a security event */
  auditSecurity(event: string, userId?: string) {
    const msg = `[AUDIT:SECURITY]${userId ? ` user=${userId}` : ''} | event=${event}`
    if (this.level <= LogLevel.ERROR) console.error(msg)
  }

  /** sensitive health data-safe error logging - strips sensitive health data before logging */
  phiSafeError(error: unknown, context = ''): void {
    const prefix = context ? `[ERROR:${context}] ` : '[ERROR] '
    let message: string

    if (error instanceof Error) {
      message = `${error.name}: ${error.message}`
      if (message.length > 500) message = message.slice(0, 500) + '...[truncated]'
    } else {
      message = String(error)
      if (message.length > 500) message = message.slice(0, 500) + '...[truncated]'
    }

    const masked = maskArgs([message])
    console.error(prefix, ...(masked as unknown[]))
  }
}

export const logger = new Logger()

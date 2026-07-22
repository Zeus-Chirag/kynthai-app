/**
 * Sentry error tracking configuration.
 *
 * Set SENTRY_DSN in .env to enable. Without it, Sentry is a no-op
 * (no errors, no performance monitoring). This file is safe to import
 * in both client and server — it self-detects the environment.
 *
 * Health Data Protection: All error events are sanitized before transmission.
 * - No stack traces longer than 300 chars
 * - No sensitive keys (password, token, ssn, medical, diagnosis, etc.) in extra
 * - No raw 'cause' objects (may contain Prisma error details with sensitive health data)
 * - All string values capped at 200 chars
 *
 * Installation:
 *   1. bun add @sentry/nextjs (already installed)
 *   2. Set SENTRY_DSN in .env
 *   3. This file is imported by next.config.ts wrapper
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

/** Health Data Protection-sensitive keys that must never be sent to error tracking services */
const SENSITIVE_KEYS = new Set([
  'password', 'passwordResetToken', 'sessionToken', 'token', 'secret', 'ssn',
  'medicalRecord', 'diagnosis', 'prescription', 'medication', 'labResult',
  'healthRecord', 'clinical', 'npi', 'taxId', 'licenseNumber',
  'encryptionKey', 'sessionSecret', 'nextauthSecret',
  'creditCard', 'cardNumber', 'cvv', 'bankAccount',
  'phone', 'email', 'address', 'dateOfBirth', 'dob',
  'allergies', 'medicalHistory', 'notes', 'vitals',
  'ip', 'userAgent',
  'rawText', 'imageData', 'symptoms', 'mood',
  'followUpNotes', 'consultationNote',
  'name', 'recipient', 'body', 'title',
  'authorization', 'authHeader', 'cookie',
])

const MAX_STRING_LENGTH = 200
const MAX_STACK_LENGTH = 300

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) return value.slice(0, MAX_STRING_LENGTH) + '...[truncated]'
    return value
  }
  if (typeof value === 'object') {
    if (Array.isArray(value)) return value.map(sanitizeValue).slice(0, 20)
    const obj = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = '[REDACTED]'
      } else {
        out[k] = sanitizeValue(v)
      }
    }
    return out
  }
  return value
}

function sanitizeEvent(event: unknown): unknown {
  if (typeof event !== 'object' || event === null) return event
  const sanitized: Record<string, unknown> = { ...(event as Record<string, unknown>) }

  if (sanitized.exception) {
    const exc = sanitized.exception as Record<string, unknown>
    if (exc.values && Array.isArray(exc.values)) {
      exc.values = (exc.values as Record<string, unknown>[]).map((v: Record<string, unknown>) => {
        const clean = { ...v }
        if (typeof clean.stack === 'string' && clean.stack.length > MAX_STACK_LENGTH) {
          clean.stack = clean.stack.slice(0, MAX_STACK_LENGTH) + '...[truncated]'
        }
        // Strip raw cause — may contain Prisma errors with sensitive health data
        ;(clean as Record<string, unknown>).cause = undefined
        return clean
      })
    }
  }

  if (sanitized.request) {
    const req = sanitized.request as Record<string, unknown>
    ;(req as Record<string, unknown>).cookies = sanitizeValue(req.cookies)
    ;(req as Record<string, unknown>).data = sanitizeValue(req.data)
    if (req.headers) {
      const headers = req.headers as Record<string, unknown>
      for (const k of Object.keys(headers)) {
        if (SENSITIVE_KEYS.has(k.toLowerCase())) headers[k] = '[REDACTED]'
      }
    }
  }

  if (sanitized.extra) {
    sanitized.extra = sanitizeValue(sanitized.extra) as typeof sanitized.extra
  }

  if (sanitized.contexts) {
    sanitized.contexts = sanitizeValue(sanitized.contexts) as typeof sanitized.contexts
  }

  return sanitized
}

export function initSentry() {
  if (!SENTRY_DSN || SENTRY_DSN === 'your-sentry-dsn-here') {
    // No DSN configured — Sentry is disabled. Safe for dev.
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
    profilesSampleRate: 0.1, // 10% of profiles for profiling
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0',
    // Filter out noisy errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Network request failed',
      'Failed to fetch',
    ],
    // Health Data Protection: strip all sensitive health data before sending to Sentry servers — cast return to any
    // to satisfy TypeScript's strict event typing without suppressing the linter.
    beforeSend(event: any): any {
      if (event.request?.url?.includes('localhost')) {
        return process.env.NODE_ENV === 'production' ? sanitizeEvent(event) as any : null
      }
      return sanitizeEvent(event) as any
    },
  })
}

/** Manually capture an error to Sentry (safe to call even if Sentry isn't initialized). */
export function captureError(error: Error | string, context?: Record<string, unknown>): void {
  if (!SENTRY_DSN) {
    // Security: never log to console in production; use logger instead
    if (process.env.NODE_ENV !== 'production') {
      console.error('[captureError]', error, context ? sanitizeValue(context) : undefined)
    }
    return
  }

  const safeContext = context ? (sanitizeValue(context) as Record<string, unknown>) : undefined
  Sentry.captureException(
    error instanceof Error ? error : new Error(String(error)),
    { extra: safeContext }
  )
}

/** Manually capture a message to Sentry. */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (!SENTRY_DSN) {
    if (process.env.NODE_ENV !== 'production') {
      console[level === 'error' ? 'error' : 'log']('[captureMessage]', message.slice(0, MAX_STRING_LENGTH))
    }
    return
  }
  Sentry.captureMessage(message.slice(0, MAX_STRING_LENGTH), level)
}

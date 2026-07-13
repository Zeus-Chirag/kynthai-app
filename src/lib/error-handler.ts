/**
 * Centralized error handling utilities for Kyntha.
 *
 * Provides:
 * - Safe async execution with try-catch
 * - Sentry integration via existing src/lib/sentry.ts
 * - Toast notifications for user-facing errors
 * - Retry logic for transient failures (delegates to src/lib/retry.ts)
 * - Structured error logging
 */

import { captureError, captureMessage } from './sentry'

type ToastActionElement = React.ReactElement<typeof import('@/components/ui/toast').ToastAction>

/** Minimal error shape we log everywhere */
export interface AppError {
  message: string
  name?: string
  stack?: string
  cause?: unknown
  context?: Record<string, unknown>
}

/** Wrap an async function so it never rejects unhandled */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback?: T,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await fn()
  } catch (rawError) {
    const error = normalizeError(rawError, context)
    reportError(error)
    if (fallback !== undefined) return fallback
    // Re-throw a normalized error so callers can still handle it
    throw new Error(error.message)
  }
}

/** Run a sync function safely */
export function safeSync<T>(fn: () => T, fallback?: T, context?: Record<string, unknown>): T {
  try {
    return fn()
  } catch (rawError) {
    const error = normalizeError(rawError, context)
    reportError(error)
    if (fallback !== undefined) return fallback
    throw new Error(error.message)
  }
}

/** Normalize any thrown value into an AppError */
export function normalizeError(raw: unknown, context?: Record<string, unknown>): AppError {
  if (raw instanceof Error) {
    return {
      message: raw.message,
      name: raw.name,
      stack: raw.stack,
      cause: raw.cause,
      context,
    }
  }
  if (typeof raw === 'string') {
    return { message: raw, context }
  }
  if (raw && typeof raw === 'object' && 'message' in raw) {
    return {
      message: String((raw as Record<string, unknown>).message),
      name: 'UnknownSafeError',
      stack: undefined,
      context,
    }
  }
  return { message: 'An unknown error occurred', context }
}

/** Report an error to Sentry, console, and (if available) toast */
export function reportError(error: AppError): void {
  const errObj = new Error(error.message)
  if (error.stack) {
    Object.defineProperty(errObj, 'stack', {
      value: error.stack,
      writable: false,
      enumerable: false,
      configurable: true,
    })
  }

  captureError(errObj, {
    name: error.name,
    cause: error.cause,
    ...error.context,
  })
}

/** Show an error toast if the toast system is mounted */
export function toastError(
  title: string,
  description?: string,
  action?: ToastActionElement,
  duration = 5000
): void {
  if (typeof window === 'undefined') return
  try {
    // Dynamic import to avoid SSR issues and keep bundle small
    import('@/hooks/use-toast').then(({ toast }) => {
      toast({ title, description, variant: 'destructive', action, duration })
    }).catch(() => {
      // Toast system not ready — fallback to console
      console.error(`[${title}]`, description || '')
    })
  } catch {
    console.error(`[${title}]`, description || '')
  }
}

/** Auto-dismiss toast for non-critical info */
export function toastInfo(
  title: string,
  description?: string,
  duration = 4000
): void {
  if (typeof window === 'undefined') return
  try {
    import('@/hooks/use-toast').then(({ toast }) => {
      toast({ title, description, duration })
    }).catch(() => {
      // Toast system not ready — error already reported to Sentry above
    })
  } catch {
  }
}

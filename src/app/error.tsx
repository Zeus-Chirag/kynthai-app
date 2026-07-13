'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { reportError, toastError, safeAsync } from '@/lib/error-handler'
import { captureMessage } from '@/lib/sentry'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (!error) return

    // ── 1. Report to Sentry (structured + flush async, non-blocking) ───────
    reportError({
      message: error.message,
      name: error.name,
      stack: error.stack,
      context: { digest: error.digest },
    })
    try {
      Sentry.flush(2000).catch(() => {
        // Ignore flush failures — error is already queued
      })
    } catch {
      // Sentry not initialized — still safe
    }

    // ── 2. User-facing toast (errors in toast never crash this component) ───
    safeAsync(
      () => Promise.resolve(toastError('Something went wrong', error.message, undefined, 4000)),
      undefined,
      { toastContext: 'error-page-toast' },
    ).catch(() => {
      // Toast system not ready — error already reported to Sentry above
    })

    // ── 3. Dev signal ───────────────────────────────────────────────────────
    try {
      captureMessage(
        `[ErrorBoundary] Page error: ${error.message}`,
        'warning',
      )
    } catch {
      // captureMessage is a no-op when Sentry DSN is unset
    }
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-4 p-8 text-center border rounded-lg border-border/60 bg-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. Please try again.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/60">
              Error ID: {error.digest}
            </p>
          )}
          {error.message && (
            <p className="text-xs text-muted-foreground/80 break-words">
              {error.message}
            </p>
          )}
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}

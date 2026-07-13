
'use client'

export const errorTracking = {
  // Initialize Sentry
  init() {
    if (typeof window === 'undefined') return
    
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
    if (!dsn) return

    // Sentry would be initialized here
    // For now, we capture errors manually
  },

  // Capture exception — HIPAA: never send raw error details to client console.
  // Client-side errors are a potential PHI surface; use silent reporting.
  captureException(error: Error, context?: Record<string, unknown>) {
    if (typeof window === 'undefined') return
    
    // HIPAA: never log raw errors to browser console in production
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[Error Tracking]', error.name + ':', String(error.message).slice(0, 100))
    }
    
    // Send to Sentry if configured (PHI sanitized server-side)
    // Integrate with backend for error logging
  },

  // Capture message
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    if (typeof window === 'undefined') return
    
  },
}

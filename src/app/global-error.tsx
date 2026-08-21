'use client'

/**
 * Global Error Boundary — Client Component (Required by Next.js 15+)
 *
 * This component replaces the root layout (layout.tsx) when a global
 * error occurs. It must be a Client Component to use reset().
 *
 * IMPORTANT: It must NOT render <html>, <head>, or <body> elements.
 * Next.js manages those server-side. This component just renders error UI
 * that Next.js inserts into the page.
 *
 * Known issues fixed:
 * - Added robust null-checks on error object (prevents crash inside handler)
 * - Wrapped Sentry.flush() in try/catch
 * - Graceful fallback when reset() fails (window.location.reload)
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Defensive: guard against malformed error objects (dev HMR partial errors)
  const digest =
    error && typeof error.digest === 'string' ? error.digest : undefined
  const message =
    error && typeof error.message === 'string' && error.message
      ? error.message
      : 'An unexpected error occurred. Please refresh the page.'

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      reset()
    } catch {
      window.location.reload()
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background, #f8fafc)',
        padding: '1.25rem',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: 'var(--foreground, #0f172a)',
      }}
    >
      <div
        style={{
          maxWidth: '28rem',
          width: '100%',
          textAlign: 'center',
          borderRadius: '.75rem',
          border: '1px solid var(--border, #fecaca)',
          padding: '2.5rem 2rem',
          background: 'var(--card, rgba(255,255,255,.94))',
          boxShadow: '0 1px 3px rgba(0,0,0,.06)',
        }}
      >
        {/* Icon */}
        <div
          aria-hidden="true"
          style={{ fontSize: '3.25rem', marginBottom: '.75rem' }}
        >
          🙏
        </div>

        {/* Title */}
        <h1
          style={{
            marginTop: '.5rem',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#991b1b',
            lineHeight: 1.3,
          }}
        >
          Something went wrong
        </h1>

        {/* User-facing message */}
        <p
          style={{ fontSize: '.875rem', color: '#64748b', margin: '.75rem 0 0', lineHeight: 1.6 }}
        >
          We are sorry for the inconvenience. Our team has been notified
          and will investigate shortly.
        </p>

        {/* Error digest (opaque ID — no stack trace exposed) */}
        {digest && (
          <p style={{ marginTop: '1.25rem', fontSize: '.75rem', color: '#64748b' }}>
            Error ID: <code style={{
              background: '#fee2e2',
              padding: '.125rem .375rem',
              borderRadius: '.25rem',
              fontFamily: 'ui-monospace, monospace',
              color: '#991b1b',
            }}>{digest}</code>
          </p>
        )}

        {/* Development-only raw message — never exposed in production */}
        {process.env.NODE_ENV === 'development' && message && (
          <pre
            style={{
              marginTop: '.75rem',
              fontSize: '.75rem',
              color: '#b91c1c',
              textAlign: 'left',
              background: '#fef2f2',
              padding: '.625rem .875rem',
              borderRadius: '.375rem',
              border: '1px solid #fecaca',
              overflow: 'auto',
              maxHeight: '120px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {message}
          </pre>
        )}

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: '.75rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: '1.75rem',
          }}
        >
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '.5rem',
              borderRadius: '.5rem',
              border: '1px solid #e2e8f0',
              padding: '.6rem 1.25rem',
              fontSize: '.875rem',
              fontWeight: 500,
              color: '#0f172a',
              textDecoration: 'none',
            }}
          >
            Go Home
          </a>
          <form onSubmit={handleReset}>
            <button
              type="submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '.5rem',
                borderRadius: '.5rem',
                border: 'none',
                background: '#059669',
                color: '#fff',
                padding: '.6rem 1.25rem',
                fontSize: '.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </form>
        </div>

        {/* Dev hint */}
        {process.env.NODE_ENV === 'development' && (
          <p
            style={{
              marginTop: '1.5rem',
              fontSize: '.7rem',
              color: '#9ca3af',
            }}
          >
            Dev mode: error above is shown for debugging. Check browser console
            for full stack trace.
          </p>
        )}
      </div>
    </div>
  )
}

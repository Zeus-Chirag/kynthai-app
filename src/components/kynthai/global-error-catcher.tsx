'use client'

import { useEffect } from 'react'
import { escapeHtml } from '@/lib/validations/sanitize'

/**
 * React treats hydration mismatches as RECOVERABLE: it re-renders the page on
 * the client and reports the mismatch via `reportError()` → a window `error`
 * event. Production minified bundles report "Minified React error #418/#421"
 * (text/HTML mismatch) or "#425" (recoverable error). Blanking the page for
 * these destroys an app that has already recovered, so they must be ignored.
 */
function isRecoverableHydrationError(message: string): boolean {
  return (
    /minified react error #4(18|21|23|25)\b/i.test(message) ||
    /hydrat/i.test(message) ||
    /did not match/i.test(message) ||
    /server-rendered html/i.test(message) ||
    /text content does not match/i.test(message)
  )
}

/** SECURITY: renderFatal uses DOM APIs, NOT innerHTML, to prevent XSS even
 *  if a browser error message or stack trace contains script-like content. */
function renderFatal(message: string, stack?: string) {
  const safeMessage = escapeHtml(message)
  const safeStack = escapeHtml(stack || 'No stack')
  // Non-destructive overlay: keep the rendered app underneath so content is
  // never lost to a recoverable error. Unique id prevents double appends.
  if (document.getElementById('kynthai-fatal-error')) return
  const container = document.createElement('div')
  container.id = 'kynthai-fatal-error'
  container.setAttribute('role', 'alert')
  container.style.cssText = 'padding:20px;color:#b91c1c;background:#fff;font-family:monospace;position:fixed;top:0;left:0;right:0;z-index:99999;border-bottom:2px solid #b91c1c;max-height:45vh;overflow:auto'
  const h1 = document.createElement('h1')
  h1.textContent = 'Something went wrong: ' + safeMessage
  const pre = document.createElement('pre')
  pre.textContent = safeStack
  container.appendChild(h1)
  container.appendChild(pre)
  document.body.appendChild(container)
}

export function GlobalErrorCatcher() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (isRecoverableHydrationError(event.message)) {
        // React already re-rendered the page client-side; nothing fatal.
        return
      }
      console.error('[GLOBAL ERROR]', event.error)
      renderFatal(event.message, event.error?.stack)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message =
        event.reason instanceof Error ? event.reason.message : String(event.reason)
      if (isRecoverableHydrationError(message)) {
        return
      }
      console.error('[UNHANDLED REJECTION]', event.reason)
      const stack =
        event.reason instanceof Error ? event.reason.stack : undefined
      renderFatal(message, stack)
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return null
}

'use client'

import { useEffect } from 'react'
import { escapeHtml } from '@/lib/validations/sanitize'

/** SECURITY: renderFatal uses DOM APIs, NOT innerHTML, to prevent XSS even
 *  if a browser error message or stack trace contains script-like content. */
function renderFatal(message: string, stack?: string) {
  const safeMessage = escapeHtml(message)
  const safeStack = escapeHtml(stack || 'No stack')
  document.body.textContent = ''  // clear existing content
  const container = document.createElement('div')
  container.style.cssText = 'padding:20px;color:red;font-family:monospace;position:fixed;top:0;left:0;right:0;z-index:99999'
  const h1 = document.createElement('h1')
  h1.textContent = 'Error: ' + safeMessage
  const pre = document.createElement('pre')
  pre.textContent = safeStack
  container.appendChild(h1)
  container.appendChild(pre)
  document.body.appendChild(container)
}

export function GlobalErrorCatcher() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('[GLOBAL ERROR]', event.error)
      renderFatal(event.message, event.error?.stack)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[UNHANDLED REJECTION]', event.reason)
      const message =
        event.reason instanceof Error ? event.reason.message : String(event.reason)
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

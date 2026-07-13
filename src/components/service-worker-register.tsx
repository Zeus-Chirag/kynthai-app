'use client'

/**
 * ServiceWorkerRegister
 *
 * Registers /sw.js in production only. Renders nothing.
 *
 * In development, Next.js runs HMR over websockets which conflicts with a
 * cached service worker, so we skip registration unless NODE_ENV=production.
 */

import * as React from 'react'

export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return

    const wasControlled = !!navigator.serviceWorker.controller
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })
        // Check for updates every 60 minutes.
        setInterval(() => {
          void reg.update().catch(() => {})
        }, 60 * 60 * 1000)

        // When a new SW takes over, reload once so the latest UI is shown.
        // Only reload if the page was already controlled — first-time visitors
        // should not be bounced.
        let refreshing = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return
          refreshing = true
          if (wasControlled) {
            window.location.reload()
          }
        })
      } catch (e) {
        console.warn('[sw] registration failed', e)
      }
    }

    // Register after the page is idle to avoid contention with first paint.
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void) => void
    }
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(register)
    } else {
      window.setTimeout(register, 1500)
    }
  }, [])

  return null
}

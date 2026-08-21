'use client'

/**
 * ServiceWorkerRegister
 *
 * Registers /sw.js in production only. Also auto-subscribes to push
 * notifications if the user has a session (non-blocking, best-effort).
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
        let refreshing = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return
          refreshing = true
          if (wasControlled) {
            window.location.reload()
          }
        })

        // Auto-subscribe to push notifications (best-effort, non-blocking)
        // — checks for existing session cookie, then subscribes if push
        // is supported and permission is granted/default.
        try {
          const authRes = await fetch('/api/auth/me', { credentials: 'include' })
          if (authRes.ok) {
            const authData = await authRes.json()
            if (authData?.user) {
              const { enablePush, pushSupported, permissionState } = await import('@/lib/push')
              if (pushSupported()) {
                const perm = permissionState()
                if (perm === 'granted' || perm === 'default') {
                  // Subscribe silently — user can disable in Settings
                  await enablePush()
                }
              }
            }
          }
        } catch {
          // No session or push not supported — continue without push
        }
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

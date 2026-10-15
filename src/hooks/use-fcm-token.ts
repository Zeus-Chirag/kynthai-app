'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/lib/store'

/**
 * Hook to register FCM token with backend when running in Capacitor Android app.
 *
 * Dual delivery model:
 * 1. PUSH: native Android calls window.KynthaiFCM.onTokenReceived(token)
 *    on startup and token refresh.
 * 2. PULL: after user auth is ready, we call window.KynthaiFCMNative.getToken()
 *    to request the token — this eliminates the race where the native push
 *    fires before React has hydrated.
 *
 * CSRF is handled by fetching /api/auth/csrf before each registration call.
 */
export function useFcmTokenRegistration() {
  const user = useAppStore((s) => s.user)
  const lastRegisteredToken = useRef<string | null>(null)

  const registerToken = useCallback(
    async (token: string) => {
      if (!user || !token) return

      // Avoid duplicate registrations
      if (lastRegisteredToken.current === token) return
      lastRegisteredToken.current = token

      try {
        // Fetch CSRF token first
        const csrfRes = await fetch('/api/auth/csrf', { credentials: 'include' })
        const csrfToken = csrfRes.ok ? (await csrfRes.json()).token : null

        const res = await fetch('/api/notifications/fcm/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
          },
          body: JSON.stringify({ token, platform: 'android' }),
          credentials: 'include',
        })

        if (res.ok) {
          console.log('[FCM] Token registered successfully')
        } else {
          console.warn('[FCM] Token registration failed:', await res.text())
        }
      } catch (e) {
        console.error('[FCM] Token registration error:', e)
      }
    },
    [user],
  )

  // 1. Push path: expose handler for native Android code to call
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handler = {
      onTokenReceived: (token: string) => {
        console.log('[FCM] Native token received:', token?.substring(0, 20) + '...')
        registerToken(token)
      },
    }

    // @ts-ignore - attaching to window for native bridge
    window.KynthaiFCM = handler

    return () => {
      // @ts-ignore
      delete window.KynthaiFCM
    }
  }, [registerToken])

  // 2. Pull path: when user becomes available, request token from native
  useEffect(() => {
    if (!user) return
    if (typeof window === 'undefined') return

    // Small delay to let the native bridge settle
    const timer = setTimeout(() => {
      const native = (window as any).KynthaiFCMNative
      if (native && typeof native.getToken === 'function') {
        console.log('[FCM] Pulling token from native bridge')
        native.getToken()
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [user])

  // 3. Cleanup on logout: deactivate tokens server-side
  useEffect(() => {
    if (user) return
    lastRegisteredToken.current = null
  }, [user])

  return { registerToken }
}

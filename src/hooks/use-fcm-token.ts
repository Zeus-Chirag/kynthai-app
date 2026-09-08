'use client'

import { useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'

/**
 * Hook to register FCM token with backend when running in Capacitor Android app.
 * The native Android code calls window.KynthaiFCM.onTokenReceived(token) 
 * which triggers the registration API call.
 */
export function useFcmTokenRegistration() {
  const { user } = useAppStore()

  const registerToken = useCallback(async (token: string) => {
    if (!user) {
      console.log('[FCM] User not authenticated, skipping token registration')
      return
    }

    try {
      const res = await fetch('/api/notifications/fcm/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
  }, [user])

  // Expose handler for native Android code to call
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

  return { registerToken }
}
'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getCsrfToken, clearCsrfCache } from '@/lib/client-fetch'
import { runWhenIdle } from '@/components/performance-wrapper'

interface AuthGuardProps {
  redirectTo?: string
  onUnauthorized?: () => void
  disableMountCheck?: boolean
}

const PUBLIC_PATHS = ['/', '/login', '/privacy', '/terms', '/cookies', '/accessibility', '/medical-disclaimer', '/pricing', '/checkout', '/grievance', '/refund-cancellation'] as string[]

const isBrowser = () => typeof window !== 'undefined'

export function AuthGuard({ redirectTo = '/login', onUnauthorized, disableMountCheck }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleUnauthorized = React.useCallback(() => {
    clearCsrfCache()
    try { void fetch('/api/auth/logout', { method: 'POST' }).catch(() => {}) } catch { /* ignore */ }
    try {
      localStorage.removeItem('kyntha-store-v2')
      sessionStorage.removeItem('kyntha-session')
    } catch { /* ignore */ }
    onUnauthorized?.()
    router.replace(redirectTo)
  }, [redirectTo, onUnauthorized, router])

  // ── Mount-time session validation ────────────────────────────────────────
  // Deferred to an idle callback so it never blocks the initial hydration
  // or extends Total Blocking Time (TBT). For already-authenticated users
  // this is a no-op; for brand-new sessions the /api/auth/me check fires
  // quickly enough to catch any server-side session expiry within ~2 s.
  React.useEffect(() => {
    if (disableMountCheck) return
    if (PUBLIC_PATHS.includes(pathname)) return
    let mounted = true

    const runCheck = async () => {
      mounted = true
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' })
        if (!mounted) return
        const data = await res.json().catch(() => ({}))
        const authenticated = Boolean((data as any)?.authenticated)
        const user = (data as any)?.user ?? null
        if (!authenticated || !user) {
          handleUnauthorized()
        }
      } catch {
        // Network error — ignore; don't bounce the user on flaky connections.
      }
    }

    const cancel = runWhenIdle(runCheck)
    return () => {
      mounted = false
      cancel?.()
    }
  }, [disableMountCheck, handleUnauthorized, pathname])

  // ── Fetch interceptor for 401 responses ─────────────────────────────────
  // Wrapping window.fetch is a hot path — defer the monkey-patch until idle
  // so it does NOT run during the initial hydration frame.
  React.useEffect(() => {
    if (!isBrowser()) return
    let mounted = true
    let patched = false

    const patchFetch = () => {
      if (patched || (window as any).__kynthaAuthGuard) return
      const originalFetch = window.fetch
      ;(window as any).__kynthaFetchOriginal = originalFetch
      ;(window as any).__kynthaAuthGuard = true
      patched = true

      window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const method = (init?.method ?? 'GET').toUpperCase()
        const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
        const nextInit: RequestInit = isMutation ? { ...(init ?? {}) } : init ?? {}

        if (isMutation) {
          try {
            const token = await getCsrfToken()
            if (token) {
              const headers = new Headers(nextInit.headers as HeadersInit | undefined)
              headers.set('x-csrf-token', token)
              nextInit.headers = headers
            }
          } catch { /* ignore */ }
        }

        const res = await originalFetch(input, nextInit)
        if (mounted) {
          try {
            const url = typeof input === 'string' ? input : (input as Request).url ?? ''
            const isKynthaApi = url.startsWith('/api/') || url.includes('/api/')
            if (isKynthaApi && res.status === 401) {
              if (!PUBLIC_PATHS.includes(pathname)) {
                handleUnauthorized()
              }
            }
          } catch { /* ignore */ }
        }
        return res
      }) as typeof window.fetch
    }

    // Fire the patch during idle so it doesn't add to the TBT window
    const cancel = runWhenIdle(patchFetch)
    // Pre-fetch CSRF token after idle too
    const cancelCsrf = runWhenIdle(() => { void getCsrfToken().catch(() => {}) })

    return () => {
      mounted = false
      if (patched) {
        window.fetch = (window as any).__kynthaFetchOriginal ?? window.fetch
        ;(window as any).__kynthaAuthGuard = false
        patched = false
      }
      cancel?.()
      cancelCsrf?.()
    }
  }, [handleUnauthorized, pathname])

  return null
}

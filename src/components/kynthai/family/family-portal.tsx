'use client'

import { useAppStore } from '@/lib/store'
import FamilyPortalClient from '@/app/family/family-portal-client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// This is the entry point loaded by portal-loaders.tsx for family role users.
export function FamilyPortal() {
  const router = useRouter()
  const { user, setLoginPortal, login: storeLogin } = useAppStore()

  useEffect(() => {
    // ponytail: removed the NODE_ENV !== 'production' guard so the demo
    // auto-login works in production when NEXT_PUBLIC_ENABLE_DEMO=true.
    const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true'
    if (!user && !isDemoMode) {
      setLoginPortal('caretaker')
      fetch('/api/auth/me', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.user) storeLogin(data.user)
          else router.replace('/login')
        })
        .catch(() => router.replace('/login'))
    }
  }, [user, router, setLoginPortal, storeLogin])

  // Demo mode fallback: show portal even without server session
  const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true'
  if (!user && !isDemoMode) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  return <main id="main-content"><FamilyPortalClient user={user as any} /></main>
}

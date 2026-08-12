'use client'

import { Suspense, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { loadPortal } from "../portal-loaders"
import { ErrorBoundary } from '@/components/kynthai/error-boundary'
import { ConsentGate } from '@/components/kynthai/consent-gate'

export default function PatientClient() {
  const router = useRouter()
  const { user, setLoginPortal, login: storeLogin } = useAppStore((s) => ({
    user: s.user,
    setLoginPortal: s.setLoginPortal,
    login: s.login,
  }))
  const { node } = loadPortal("patient", user)

  useEffect(() => {
    if (!user) {
      setLoginPortal('patient')
      // ponytail: attempt to recover a real Supabase session before
      // redirecting to /login — handles the case where the store is
      // empty (hard reload, cleared localStorage) but a session cookie
      // still exists. Falls back to /login if nothing recovers.
      fetch('/api/auth/me', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.user) {
            storeLogin(data.user)
          } else {
            router.replace('/login')
          }
        })
        .catch(() => router.replace('/login'))
    }
  }, [user, router, setLoginPortal, storeLogin])

  // ── Consent Gate: block medical data if required consents are missing ──────
  if (user?.role === 'patient') {
    const hasConsent = user.consentAccepted && user.dataProcessingConsent
    if (!hasConsent) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <ConsentGate
            consentAccepted={!!user.consentAccepted}
            dataProcessingConsent={!!user.dataProcessingConsent}
            userName={user.name}
          />
        </div>
      )
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          </div>
        }
      >
        {node}
      </Suspense>
    </ErrorBoundary>
  )
}

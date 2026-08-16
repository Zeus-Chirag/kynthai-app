'use client'

import { useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { loadPortal } from "../portal-loaders"
import { ErrorBoundary } from '@/components/kynthai/error-boundary'
import { ConsentGate } from '@/components/kynthai/consent-gate'

export default function PatientClient() {
  const router = useRouter()
  // ponytail: slice subscriptions (not whole-store) so unrelated writes like
  // alarmMode/setAlarmMode do NOT re-render this client → keeps loadPortal from
  // re-running and avoids remounting the portal subtree.
  const user = useAppStore((s) => s.user)
  const setLoginPortal = useAppStore((s) => s.setLoginPortal)
  const storeLogin = useAppStore((s) => s.login)
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

  // ponytail: the lazy portal component (loadPortal → dynamic()) already renders
  // its own PortalSkeleton via its `loading` option, so an extra <Suspense>
  // fallback here created a second, sequential loading flash on every portal
  // navigation ("2 loading states"). Render the node directly instead.
  return (
    <ErrorBoundary>
      {node}
    </ErrorBoundary>
  )
}

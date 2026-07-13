'use client'

import { Suspense, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { loadPortal } from "../portal-loaders"
import { ErrorBoundary } from '@/components/kyntha/error-boundary'
import { ConsentGate } from '@/components/kyntha/consent-gate'

export default function PatientClient() {
  const router = useRouter()
  const { user, setLoginPortal } = useAppStore()
  const { node } = loadPortal("patient", user)

  useEffect(() => {
    if (!user) {
      setLoginPortal('patient')
      router.replace('/login')
    }
  }, [user, router, setLoginPortal])

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
        <div className="text-sm text-muted-foreground">Redirecting...</div>
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

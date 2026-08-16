'use client'

import { useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { loadPortal } from "../portal-loaders"
import { ErrorBoundary } from '@/components/kynthai/error-boundary'

export default function DoctorClient() {
  const router = useRouter()
  const { user, setLoginPortal, login: storeLogin } = useAppStore()
  const { node } = loadPortal("doctor", user)

  useEffect(() => {
    if (!user) {
      setLoginPortal('doctor')
      fetch('/api/auth/me', { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.user) storeLogin(data.user)
          else router.replace('/login')
        })
        .catch(() => router.replace('/login'))
    }
  }, [user, router, setLoginPortal, storeLogin])

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

'use client'

import { useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { loadPortal } from "../portal-loaders"
import { ErrorBoundary } from '@/components/kynthai/error-boundary'
import { AppLoader } from '@/components/kynthai/app-loader'

export default function CaretakerClient() {
  const router = useRouter()
  const { user, setLoginPortal, login: storeLogin } = useAppStore()
  const { node } = loadPortal("caretaker", user)

  useEffect(() => {
    if (!user) {
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

  if (!user) {
    return <AppLoader label="Loading…" />
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

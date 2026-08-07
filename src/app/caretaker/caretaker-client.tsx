'use client'

import { Suspense, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { loadPortal } from "../portal-loaders"
import { ErrorBoundary } from '@/components/kynthai/error-boundary'

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

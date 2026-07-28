'use client'

import { Suspense, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { loadPortal } from "../portal-loaders"
import { ErrorBoundary } from '@/components/kynthaii/error-boundary'

export default function LabClient() {
  const router = useRouter()
  const { user, setLoginPortal } = useAppStore()
  const { node } = loadPortal("lab", user)

  useEffect(() => {
    if (!user) {
      setLoginPortal('lab')
      router.replace('/login')
    }
  }, [user, router, setLoginPortal])

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

'use client'

import { Suspense, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { loadPortal } from '../portal-loaders'
import { ErrorBoundary } from '@/components/kyntha/error-boundary'

export default function AdminClient() {
  const router = useRouter()
  const { user } = useAppStore()

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.replace('/login')
    }
  }, [user, router])

  if (!user || user.role !== 'admin') return null

  const { node } = loadPortal('admin', user)

  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      }>
        {node}
      </Suspense>
    </ErrorBoundary>
  )
}

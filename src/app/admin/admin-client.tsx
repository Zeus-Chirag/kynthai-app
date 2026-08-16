'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { loadPortal } from '../portal-loaders'
import { ErrorBoundary } from '@/components/kynthai/error-boundary'
import { AppLoader } from '@/components/kynthai/app-loader'

export default function AdminClient() {
  const router = useRouter()
  const { user } = useAppStore()

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.replace('/login')
    }
  }, [user, router])

  if (!user || user.role !== 'admin') return <AppLoader label="Loading…" />

  const { node } = loadPortal('admin', user)

  // ponytail: the lazy portal component (dynamic()) already renders its own
  // PortalSkeleton, so the extra <Suspense> fallback only created a second
  // loading flash. Render the node directly.
  return (
    <ErrorBoundary>
      {node}
    </ErrorBoundary>
  )
}

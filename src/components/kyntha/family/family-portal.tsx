'use client'

import { useAppStore } from '@/lib/store'
import FamilyPortalClient from '@/app/family/family-portal-client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// This is the entry point loaded by portal-loaders.tsx for family role users.
export function FamilyPortal() {
  const router = useRouter()
  const { user, setLoginPortal } = useAppStore()

  useEffect(() => {
    if (!user) {
      setLoginPortal('caretaker')
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

  return <main id="main-content"><FamilyPortalClient user={user} /></main>
}

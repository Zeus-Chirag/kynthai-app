'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAppStore, type AuthUser } from '@/lib/store'
import { LabVerification } from './lab-verification'
import { LabDashboard } from './lab-dashboard'

type ProfileState = 'loading' | 'none' | 'exists'

interface LabProfile {
  id: string
  labName: string
  licenseNumber: string
  city: string
  address: string
  homeCollection: boolean
  tests: { name: string; price: number }[]
  verified: boolean
}

// Demo profile used when a user signs in via the "Lab demo" button.
const DEMO_PROFILE: LabProfile = {
  id: 'demo_lab_profile',
  labName: 'Kyntha Diagnostic Center',
  licenseNumber: 'CLIA-DEMO-001',
  city: 'Austin, TX',
  address: '1400Health Ave, Austin, TX 78701',
  homeCollection: true,
  tests: [
    { name: 'Complete Blood Count', price: 35 },
    { name: 'Lipid Panel', price: 49 },
    { name: 'HbA1c', price: 39 },
    { name: 'Thyroid Panel', price: 59 },
    { name: 'Vitamin D', price: 45 },
    { name: 'Liver Function Panel', price: 49 },
  ],
  verified: true,
}

export function LabApp({ user }: { user: AuthUser }) {
  const { logout } = useAppStore()
  const router = useRouter()
  const [state, setState] = React.useState<ProfileState>('loading')
  const [profile, setProfile] = React.useState<LabProfile | null>(null)

  const handleLogout = React.useCallback(() => {
    logout()
    router.replace('/')
  }, [logout, router])

  const load = React.useCallback(async () => {
    setState('loading')
    // Demo login: skip backend so the dashboard renders immediately.
    if (user.isDemo) {
      setProfile(DEMO_PROFILE)
      setState('exists')
      return
    }
    try {
      const res = await fetch(`/api/labs?userId=${encodeURIComponent(user.id)}`)
      if (res.status === 404) {
        setState('none')
        return
      }
      if (!res.ok) throw new Error('Failed to load profile')
      const data = await res.json()
      setProfile(data)
      setState('exists')
    } catch {
      // Backend not implemented — show the verification form by default
      setState('none')
    }
  }, [user.id, user.isDemo])

  React.useEffect(() => {
    load()
  }, [load])

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-foreground">Loading your lab dashboard</p>
          <p className="text-xs text-muted-foreground">Checking verification status and bookings…</p>
        </div>
      </div>
    )
  }

  if (state === 'none' || !profile) {
    return (
      <LabVerification
        user={user}
        onSubmitted={() => {
          load()
        }}
      />
    )
  }

  if (profile) return <LabDashboard user={user} profile={profile} onLogout={handleLogout} />

  return null
}

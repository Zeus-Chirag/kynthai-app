import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Family Health Portal',
  description: 'Manage your family\'s medications, reminders, and health alerts.',
}

import FamilyPortalClient from './family-portal-client'
import { requireSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function FamilyPortalPage() {
  const user = await requireSessionUser()
  // SECURITY-CRITICAL: only caretaker-role users may access the family portal.
  const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true' && process.env.NODE_ENV !== 'production';

  // In demo mode, pass a synthetic demo user to the client component.
  const demoUser = isDemoMode
    ? { id: 'demo-caretaker', name: 'Demo Family', email: 'caretaker@kynthai.app', role: 'caretaker' }
    : user;

  if (!user && !isDemoMode) redirect('/login')
  if (user && user.role !== 'caretaker') redirect('/login')
  return <FamilyPortalClient user={demoUser as any} />
}

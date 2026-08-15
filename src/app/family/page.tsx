import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Family Health Portal',
  description: 'Manage your family\'s medications, reminders, and health alerts.',
}

import FamilyPortalClient from './family-portal-client'
import { requireSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function FamilyPage() {
  const user = await requireSessionUser()
  if (!user || (user.role !== 'caretaker' && user.subscriptionTier !== 'family_pro')) redirect('/login')
  return <FamilyPortalClient />
}

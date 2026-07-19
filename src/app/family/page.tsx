export const dynamic = 'force-dynamic'

import FamilyPortalClient from './family-portal-client'
import { requireSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function FamilyPortalPage() {
  const user = await requireSessionUser()
  // SECURITY-CRITICAL: only caretaker-role users may access the family portal.
  // Without this guard, a doctor, patient, lab, or admin could read/write
  // family-member data (medications, conditions, emergency alerts) without
  // the explicit family-management role assignment.
  // Demo mode bypass: client-side user stored in zustand.
  const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true' && process.env.NODE_ENV !== 'production';
  if (!user && !isDemoMode) redirect('/login')
  if (user && user.role !== 'caretaker') redirect('/login')
  return <FamilyPortalClient user={user as any} />
}

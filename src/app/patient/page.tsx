export const dynamic = 'force-dynamic'

import PatientClient from './patient-client'
import { requireSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function PatientPage() {
  const user = await requireSessionUser()
  if (!user || user.role !== 'patient') redirect('/login')
  return <PatientClient />
}

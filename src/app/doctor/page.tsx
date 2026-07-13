export const dynamic = 'force-dynamic'

import DoctorClient from './doctor-client'
import { requireSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DoctorPage() {
  const user = await requireSessionUser()
  if (!user || user.role !== 'doctor') redirect('/login')
  return <DoctorClient />
}

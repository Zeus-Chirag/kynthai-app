import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Doctor Portal',
  description: 'Manage consultations, patients, and practice on Kynthai.',
}

import DoctorClient from './doctor-client'
import { requireSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DoctorPage() {
  const user = await requireSessionUser()
  if (!user || user.role !== 'doctor') redirect('/login')
  return <DoctorClient />
}

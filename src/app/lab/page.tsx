export const dynamic = 'force-dynamic'

import LabClient from './lab-client'
import { requireSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function LabPage() {
  const user = await requireSessionUser()
  if (!user || user.role !== 'lab') redirect('/login')
  return <LabClient />
}

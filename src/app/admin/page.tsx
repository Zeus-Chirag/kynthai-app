export const dynamic = 'force-dynamic'

import AdminClient from './admin-client'
import { redirect } from 'next/navigation'
import { requireSessionUser } from '@/lib/auth'

export default async function AdminPage() {
  const user = await requireSessionUser()
  if (!user || user.role !== 'admin') redirect('/login')
  return <AdminClient />
}

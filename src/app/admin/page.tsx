import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Platform administration and system management.',
}

import AdminClient from './admin-client'
import { requireSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const user = await requireSessionUser()
  if (!user || user.role !== 'admin') redirect('/login')
  return <AdminClient />
}

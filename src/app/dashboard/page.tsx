import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your health management dashboard.',
}

import { requireSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const user = await requireSessionUser()
  if (!user) redirect('/login')
  redirect(`/${user.role}`)
}

export const dynamic = 'force-dynamic'

import CaretakerClient from './caretaker-client'
import { requireSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function CaretakerPage() {
  const user = await requireSessionUser()
  if (!user || user.role !== 'caretaker') redirect('/login')
  return <CaretakerClient />
}

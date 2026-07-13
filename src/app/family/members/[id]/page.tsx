export const dynamic = 'force-dynamic'

import FamilyMemberDetailClient from '@/components/kyntha/family/family-member-detail'
import { requireSessionUser } from '@/lib/auth'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function FamilyMemberDetailPage({ params }: PageProps) {
  const user = await requireSessionUser()
  if (!user) notFound()
  const { id } = await params
  return <FamilyMemberDetailClient memberId={id} user={user} />
}

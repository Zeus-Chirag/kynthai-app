import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonError, jsonOk, checkConsent } from '@/lib/api-helpers'
import { rateLimit } from '@/lib/security'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  if (checkConsent(user!)) return checkConsent(user!)!

  const { id: doctorId } = await params
  const doctor = await db.doctorProfile.findUnique({ where: { id: doctorId } })
  if (!doctor) return jsonError('Doctor not found', 404)

  const slots = await db.doctorAvailabilitySlot.findMany({
    where: { doctorId, active: true },
    orderBy: { day: 'asc' },
  })

  return jsonOk(slots)
}

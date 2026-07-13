import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { sanitizeText, rateLimit } from '@/lib/security'
import { requireAuth, jsonError, jsonOk } from '@/lib/api-helpers'
import { logAudit } from '@/lib/auth'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

// GET /api/doctors/patients/search?q=... — search patients by name, email, or phone.
export async function GET(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  const u = user!

  await logAudit(user.id, 'doctor.patients.search', { resourceType: 'User' })
  if (user.role !== 'doctor') return jsonError('Only doctors may search patients', 403)

  const q = sanitizeText(req.nextUrl.searchParams.get('q'), 100).trim()
  if (!q || q.length < 2) return jsonOk({ patients: [] })

  try {
    // Purpose limitation: only return patients with whom this doctor has an
    // existing appointment relationship. A doctor cannot enumerate the entire
    // patient directory.
    const profile = await db.doctorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })
    if (!profile) return jsonOk({ patients: [] })

    const linkedAppointments = await db.appointment.findMany({
      where: { doctorId: profile.id },
      select: { patientId: true },
    })
    const linkedPatientIds = [...new Set(linkedAppointments.map(a => a.patientId))]
    if (linkedPatientIds.length === 0) return jsonOk({ patients: [] })

    // Search only within the doctor's existing patient set.
    const patients = await db.user.findMany({
      where: {
        id: { in: linkedPatientIds },
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
        ],
      },
      select: { id: true, name: true, email: true },
      take: 10,
    })
    return jsonOk({ patients })
  } catch (error) {
    logger.phiSafeError(error)
    return jsonError('Search failed', 500)
  }
}

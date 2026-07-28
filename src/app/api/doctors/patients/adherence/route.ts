import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { rateLimit } from '@/lib/security'
import { requireAuth, jsonError, jsonOk } from '@/lib/api-helpers'
import { todayStr, dateStr } from '@/lib/utils'
export const dynamic = 'force-dynamic'

// GET /api/doctors/patients/adherence
// Returns all the doctor's patients with their medication adherence stats.
export async function GET(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  const u = user!
  if (u.role !== 'doctor') return jsonError('Only doctors may view patient adherence', 403)

  await logAudit(user.id, 'doctor.patients.adherence', { resourceType: 'Appointment' })

  const profile = await db.doctorProfile.findUnique({ where: { userId: u.id } })
  if (!profile) return jsonError('Doctor profile not found. Submit verification first.', 404)
  if (!profile.verified) return jsonError('Only verified doctors may view patient adherence', 403)

  const appointments = await db.appointment.findMany({
    where: { doctorId: profile.id },
    include: { patient: true },
  })
  const patientIds = Array.from(new Set(appointments.map(((a: any) => a.patientId))))

  const today = todayStr()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const patients = await Promise.all(
    patientIds.map(async (pid) => {
      const patient = appointments.find((a: any) => a.patientId === pid)!.patient
      const meds = await db.medication.findMany({
        where: { userId: pid, active: true },
      })
      const medIds = meds.map((m: any) => m.id)
      const todayReminders = medIds.length
        ? await db.reminder.findMany({ where: { medicationId: { in: medIds }, date: today } })
        : []
      const weekReminders = medIds.length
        ? await db.reminder.findMany({
            where: { medicationId: { in: medIds }, date: { gte: dateStr(sevenDaysAgo) } },
          })
        : []
      const takenToday = todayReminders.filter((r: any) => r.status === 'taken').length
      const takenWeek = weekReminders.filter((r: any) => r.status === 'taken').length
      const adherence = weekReminders.length
        ? Math.round((takenWeek / weekReminders.length) * 100)
        : 0

      // Fetch the latest prescription with inviteToken for this patient
      const latestRx = await db.prescription.findFirst({
        where: { patientId: pid, doctorId: profile.id, inviteToken: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { inviteToken: true },
      })
      const inviteLink = latestRx?.inviteToken ? `/invite?token=${latestRx.inviteToken}` : null

      return {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        medications: meds.length,
        todayReminders: todayReminders.length,
        takenToday,
        weekReminders: weekReminders.length,
        takenWeek,
        adherence,
        inviteLink,
      }
    }),
  )

  return jsonOk({ patients })
}

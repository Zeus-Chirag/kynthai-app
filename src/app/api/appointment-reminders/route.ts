import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, jsonError, jsonOk, checkConsent } from '@/lib/api-helpers'
import { rateLimit } from '@/lib/security'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  const u = user!

  const consentErr = checkConsent(u)
  if (consentErr) return consentErr

  const now = new Date()
  const windowHours = 72
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000)

  // Quiet hours: 10 PM - 8 AM local time — do not return reminders in that window
  const quietStartHour = 22
  const quietEndHour = 8
  const quietStart = new Date(now)
  quietStart.setHours(quietStartHour, 0, 0, 0)
  const quietEnd = new Date(now)
  quietEnd.setHours(quietEndHour, 0, 0, 0)
  if (quietEnd <= quietStart) {
    quietEnd.setDate(quietEnd.getDate() + 1)
  }

  let appts: any[] = []
  if (u.role === 'patient') {
    appts = await db.appointment.findMany({
      where: {
        patientId: u.id,
        status: { in: ['pending', 'confirmed'] },
        scheduledAt: { gte: now, lte: windowEnd },
        deletedAt: null,
      },
      include: { doctor: { include: { user: true } } },
      orderBy: { scheduledAt: 'asc' },
    })
  } else if (u.role === 'doctor') {
    const profile = await db.doctorProfile.findUnique({ where: { userId: u.id } })
    if (!profile) return jsonOk([])
    appts = await db.appointment.findMany({
      where: {
        doctorId: profile.id,
        status: { in: ['pending', 'confirmed'] },
        scheduledAt: { gte: now, lte: windowEnd },
        deletedAt: null,
      },
      include: { patient: true },
      orderBy: { scheduledAt: 'asc' },
    })
  } else {
    return jsonError('Role not supported', 400)
  }

  const reminders = appts.map((a) => {
    const scheduledAt = a.scheduledAt
    const hide = scheduledAt >= quietStart && scheduledAt <= quietEnd
    return {
      id: a.id,
      scheduledAt: scheduledAt.toISOString(),
      type: a.type,
      status: a.status,
      doctorName: a.doctor?.user?.name ?? null,
      patientName: a.patient?.name ?? null,
      price: a.price,
      reason: a.reason ?? null,
      notes: a.notes ?? null,
      quietHoursHidden: hide,
    }
  })

  return jsonOk(reminders)
}

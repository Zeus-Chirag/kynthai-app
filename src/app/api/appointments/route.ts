import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { sanitizeText, rateLimit } from '@/lib/security'
import { requireAuth, requireAuthWithCsrf, jsonError, jsonOk, readJson, audit, checkConsent, jsonPage } from '@/lib/api-helpers'
import { createAppointmentSchema, updateAppointmentSchema, appointmentsQuerySchema } from '@/lib/schemas'
import { computeCommission } from '@/lib/commission'
import { sendNotification } from '@/lib/notifications'
// Prevent static generation — reads session + DB at runtime
export const dynamic = 'force-dynamic'

// GET /api/appointments?patientId=...&doctorId=...
// Patient sees own appointments. Doctor sees appointments on their profile.
export async function GET(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  const u = user!

  const consentErr = checkConsent(u)
  if (consentErr) return consentErr

  const qpResult = appointmentsQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!qpResult.success) {
    const issues = qpResult.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
    return jsonError('Invalid query parameters', 400, 'VALIDATION_ERROR', { issues })
  }
  const qp = qpResult.data
  const patientId = qp.patientId
  const doctorId  = qp.doctorId
  const status    = qp.status
  const cursor    = qp.cursor
  const limit     = qp.limit

  // IDOR: patient may only view their own appointments.
  if (patientId && patientId !== u.id) {
    return jsonError('Forbidden — patientId must match session', 403)
  }

  const and: Prisma.AppointmentWhereInput[] = []
  if (patientId) and.push({ patientId })
  if (doctorId) {
    // IDOR: doctor may only view appointments for their own doctor profile.
    if (u.role === 'doctor') {
      const profile = await db.doctorProfile.findUnique({ where: { userId: u.id } })
      if (!profile || profile.id !== doctorId) {
        return jsonError('Forbidden — doctorId must match your profile', 403)
      }
    }
    and.push({ doctorId })
  }
  if (status) and.push({ status: status === 'no-show' ? 'no_show' : status })

  // If no filter, default to caller's own scope.
  if (!patientId && !doctorId) {
    if (u.role === 'patient') and.push({ patientId: u.id })
    else if (u.role === 'doctor') {
      const profile = await db.doctorProfile.findUnique({ where: { userId: u.id } })
      if (!profile) return jsonOk([])
      and.push({ doctorId: profile.id })
    } else {
      return jsonError('patientId or doctorId query param required', 400)
    }
  }

  const where: Prisma.AppointmentWhereInput = { AND: and }

  const take = limit + 1
  const findArgs: any = { where, include: { patient: true, doctor: { include: { user: true, specialization: true } } }, orderBy: { scheduledAt: 'desc' } as const, take }
  if (cursor) {
    findArgs.cursor = { id: cursor }
    findArgs.skipCursor = true
  }
  const appts = await db.appointment.findMany(findArgs as Parameters<typeof db.appointment.findMany>[0]) as any[]
  const hasMore = appts.length > limit
  const page = hasMore ? appts.slice(0, limit) : appts
  const nextCursor = hasMore && page.length > 0 ? (page[page.length - 1]!.id) : null

  const data = page.map((a) => ({
    id: a.id,
    doctorId: a.doctorId,
    patientId: a.patientId,
    patientName: a.patient.name,
    doctorName: a.doctor.user.name,
    specialization: a.doctor.specialization,
    scheduledAt: a.scheduledAt.toISOString(),
    type: a.type,
    status: a.status,
    price: a.price,
    commission: a.commission,
    reason: a.reason,
    notes: a.notes,
  }))

  return jsonPage(data, { cursor: nextCursor, limit, hasMore, totalCount: appts.length })
}

// POST /api/appointments — book an appointment
export async function POST_reschedule(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!
  const u = user!

  const rawBody = await readJson(req)
  if (!rawBody) return jsonError('Invalid JSON', 400, 'INVALID_JSON')
  const apptResult = updateAppointmentSchema.safeParse(rawBody)
  if (!apptResult.success) {
    const fields: Record<string, string> = {}
    for (const issue of apptResult.error.issues) {
      fields[String(issue.path.join('.') || 'body')] = issue.message
    }
    return jsonError('Validation failed', 422, 'VALIDATION_ERROR', { fields })
  }
  const body = apptResult.data

  const appt = await db.appointment.findUnique({ where: { id: body.id } })
  if (!appt) return jsonError('Appointment not found', 404)
  if (appt.status === 'cancelled' || appt.status === 'completed') {
    return jsonError('Cannot reschedule a completed or cancelled appointment', 400)
  }

  if (!body.notes || !String(body.notes).trim()) {
    return jsonError('Please provide a reason for rescheduling', 400)
  }

  const updated = await db.appointment.update({
    where: { id: appt.id },
    data: { status: 'rescheduled', notes: sanitizeText(body.notes, 1000) },
  })

  await logAudit(u.id, 'appointment.reschedule', 'appt=' + updated.id)
  return jsonOk({ id: updated.id, status: updated.status })
}

export async function PUT(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!
  const u = user!

  const rawBody = await readJson(req)
  if (!rawBody) return jsonError('Invalid JSON', 400, 'INVALID_JSON')
  const apptResult = updateAppointmentSchema.safeParse(rawBody)
  if (!apptResult.success) {
    const fields: Record<string, string> = {}
    for (const issue of apptResult.error.issues) {
      fields[String(issue.path.join('.') || 'body')] = issue.message
    }
    return jsonError('Validation failed', 422, 'VALIDATION_ERROR', { fields })
  }
  const body = apptResult.data
  const status = body.status

  const appt = await db.appointment.findUnique({ where: { id: body.id } })
  if (!appt) return jsonError('Appointment not found', 404)

  // IDOR: only the patient, the doctor (owner of doctorId profile), or admin can update.
  const doctorProfile = await db.doctorProfile.findUnique({ where: { id: appt.doctorId } })
  const isPatient = appt.patientId === u.id
  const isDoctor = doctorProfile?.userId === u.id
  const isAdmin = u.role === 'admin'
  if (!isPatient && !isDoctor && !isAdmin) {
    return jsonError('Forbidden — you cannot modify this appointment', 403)
  }

  const updated = await db.appointment.update({
    where: { id: appt.id },
    data: { status: status === 'no-show' ? 'no_show' : status, notes: body.notes ? sanitizeText(body.notes, 1000) : undefined },
  })

  await logAudit(u.id, 'appointment.update', `appt=${appt.id} status=${status}`)
  return jsonOk(updated)
}

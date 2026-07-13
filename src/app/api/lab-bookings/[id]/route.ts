import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { sanitizeText, rateLimit } from '@/lib/security'
import { requireAuth, requireAuthWithCsrf, jsonError, jsonOk, readJson, audit, checkConsent } from '@/lib/api-helpers'
import { sendNotification } from '@/lib/notifications'
export const dynamic = 'force-dynamic'

/**
 * PATCH /api/lab-bookings/[id] — lab/patient updates booking status
 *
 * WORKFLOW:
 *   pending → sample_collected → completed
 *
 * Labs (owner) can advance status. Admins can do anything.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(req, 30, 60000)
  if (limited) return limited

  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!
  const u = user!

  const consentErr = checkConsent(u)
  if (consentErr) return consentErr

  const { id } = await params
  const booking = await db.labBooking.findUnique({ where: { id }, include: { lab: true } })
  if (!booking) return jsonError('Booking not found', 404)

  // Only the owning lab or admin can update
  if (booking.lab.userId !== u.id && u.role !== 'admin') {
    return jsonError('Forbidden — only the owning lab can update bookings', 403)
  }

  const body = await readJson<{ status?: string; notes?: string }>(req)
  if (!body) return jsonError('Invalid JSON', 400)

  const VALID_TRANSITIONS: Record<string, string[]> = {
    pending: ['sample_collected', 'cancelled'],
    sample_collected: ['processing', 'completed'],
    processing: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  }

  const updates: Record<string, unknown> = {}

  if (body.status) {
    const nextStatus = sanitizeText(body.status, 30)
    const allowed = VALID_TRANSITIONS[booking.status] || []
    if (!allowed.includes(nextStatus)) {
      return jsonError(
        `Cannot transition from ${booking.status} → ${nextStatus}. Allowed: ${allowed.join(', ') || 'none (terminal)'}`,
        400,
        'INVALID_STATUS_TRANSITION',
      )
    }
    updates.status = nextStatus
  }

  if (body.notes !== undefined) {
    updates.notes = sanitizeText(body.notes, 2000) || null
  }

  const updated = await db.labBooking.update({ where: { id }, data: updates })
  await logAudit(u.id, 'lab-bookings.patch', `booking=${id} status=${updated.status}`)

  // Notify patient on status change
  try {
    if (updated.status !== booking.status && updated.status !== 'cancelled') {
      await sendNotification(
        { userId: updated.patientId },
        {
          title: statusLabel(updated.status),
          body: `${booking.lab.labName}: Your test status updated to "${statusLabel(updated.status)}".`,
          type: 'lab_booking_update',
          data: { bookingId: updated.id, status: updated.status },
        },
      )
    }
  } catch { /* best-effort */ }

  return jsonOk({
    id: updated.id,
    status: updated.status,
    notes: updated.notes,
    scheduledAt: updated.scheduledAt.toISOString(),
    previousStatus: booking.status,
  })
}

/**
 * GET /api/lab-bookings/[id] — single booking detail
 *
 * SECURITY: Patients see their own, labs own the booking, admin sees all.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  const u = user!

  const { id } = await params
  const booking = await db.labBooking.findUnique({
    where: { id },
    include: {
      patient: true,
      lab: { include: { user: true } },
    },
  })
  if (!booking) return jsonError('Booking not found', 404)

  const isPatient = booking.patientId === u.id
  const isLab = booking.lab.userId === u.id
  if (!isPatient && !isLab && u.role !== 'admin') {
    return jsonError('Forbidden', 403)
  }

  return jsonOk({
    id: booking.id,
    labId: booking.labId,
    labName: booking.lab.labName,
    patientId: booking.patientId,
    patientName: booking.patient.name,
    patientEmail: booking.patient.email,
    tests: JSON.parse(booking.tests || '[]'),
    scheduledAt: booking.scheduledAt.toISOString(),
    status: booking.status,
    price: booking.price,
    commission: booking.commission,
    homeCollection: booking.homeCollection,
    notes: booking.notes,
    hasResultsFile: !!booking.resultsFile,
    resultsNote: booking.resultsNote,
    resultUploadedAt: booking.resultUploadedAt?.toISOString() ?? null,
  })
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Booking confirmed',
    sample_collected: 'Sample collected',
    processing: 'Processing',
    completed: 'Results ready',
    cancelled: 'Booking cancelled',
  }
  return map[status] || status
}

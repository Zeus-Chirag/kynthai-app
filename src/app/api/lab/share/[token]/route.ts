import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { rateLimit } from '@/lib/security'
import { requireAuth, jsonError, jsonOk } from '@/lib/api-helpers'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * GET /api/lab/share/[token] — doctor accesses shared lab results
 *
 * Validates share token, checks expiry, returns results data + file token
 * for the doctor to download via /api/upload/[token]
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const limited = rateLimit(req, 20, 60000)
  if (limited) return limited

  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  const u = user!

  // Only doctors (and admins) can access shared results
  if (u.role !== 'doctor' && u.role !== 'admin') {
    return jsonError('Forbidden — doctors only', 403)
  }

  const { token } = await params
  if (!token) return jsonError('Share token required', 400)

  const booking = await db.labBooking.findUnique({
    where: { shareToken: token },
    include: {
      lab: true,
      patient: { select: { id: true, name: true, email: true } },
    },
  })

  if (!booking) return jsonError('Invalid or expired share link', 404)
  if (!booking.shareExpiresAt || booking.shareExpiresAt < new Date()) {
    return jsonError('Share link has expired', 410)
  }

  // Verify this doctor is the intended recipient (optional: could check if doctor was in notified list)
  // For now, any verified doctor with the link can access - token is the auth

  await logAudit(u.id, 'lab_bookings.share.access', `booking=${booking.id}`)

  return jsonOk({
    id: booking.id,
    status: booking.status,
    tests: JSON.parse(booking.tests || '[]'),
    hasResultsFile: !!booking.resultsFile,
    resultsFile: booking.resultsFile, // doctor gets the file token
    resultsNote: booking.resultsNote,
    resultUploadedAt: booking.resultUploadedAt?.toISOString() ?? null,
    labName: booking.lab.labName,
    patientName: booking.patient?.name ?? 'Patient',
    shareExpiresAt: booking.shareExpiresAt?.toISOString() ?? null,
  })
}
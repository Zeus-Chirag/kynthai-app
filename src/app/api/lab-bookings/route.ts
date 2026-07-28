import { NextRequest } from 'next/server'
// import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { sanitizeText, rateLimit } from '@/lib/security'
import { requireAuth, requireAuthWithCsrf, jsonError, jsonOk, readJson, audit, parseJsonCol, checkConsent } from '@/lib/api-helpers'
import { logAudit } from '@/lib/auth'
import { sendNotification } from '@/lib/notifications'
import { LAB_BASE_FEE_PCT, resolveTier, effectiveFeePct } from '@/lib/commission'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

// GET /api/lab-bookings?patientId=...
export async function GET(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  const u = user!

  const consentErr = checkConsent(u)
  if (consentErr) return consentErr

  const sp = req.nextUrl.searchParams
  const patientId = sp.get('patientId')?.trim()
  const labId = sp.get('labId')?.trim()

  if (patientId && patientId !== u.id && u.role !== 'admin') {
    return jsonError('Forbidden — patientId must match session', 403)
  }

  const and: any[] = []

  if (u.role === 'patient') {
    and.push({ patientId: u.id })
  } else if (u.role === 'lab') {
    if (labId) {
      const profile = await db.labProfile.findUnique({ where: { userId: u.id } })
      if (!profile || profile.id !== labId) {
        return jsonError('Forbidden — labId must match your profile', 403)
      }
      and.push({ labId })
    } else {
      const profile = await db.labProfile.findUnique({ where: { userId: u.id } })
      if (!profile) return jsonOk([])
      and.push({ labId: profile.id })
    }
  } else if (u.role === 'admin') {
    if (patientId) and.push({ patientId })
    if (labId) and.push({ labId })
  } else {
    return jsonError('patientId or labId query param required', 400)
  }

  const where: any = { AND: and }
  const bookings = await db.labBooking.findMany({
    where,
    include: { patient: true, lab: { include: { user: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  await logAudit(user.id, 'lab_booking.list', { resourceType: 'LabBooking' })
  return jsonOk(
    bookings.map((b: any) => ({
      id: b.id,
      labId: b.labId,
      labName: b.lab.labName,
      patientId: b.patientId,
      patientName: b.patient.name,
      tests: parseJsonCol(b.tests, []),
      scheduledAt: b.scheduledAt.toISOString(),
      status: b.status,
      price: b.price,
      commission: b.commission,
      homeCollection: b.homeCollection,
    })),
  )
}

// POST /api/lab-bookings — book a lab test
export async function POST(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!
  const u = user!

  const body = await readJson<{
    labId?: string
    patientId?: string
    scheduledAt?: string
    tests?: Array<{ name: string; price: number }>
    homeCollection?: boolean
  }>(req)
  if (!body) return jsonError('Invalid JSON', 400)
  if (!body.labId) return jsonError('labId is required', 400)
  if (!body.scheduledAt) return jsonError('scheduledAt is required', 400)

  const patientId = body.patientId || u.id
  if (u.role === 'patient' && patientId !== u.id) {
    return jsonError('You can only book for yourself', 403)
  }

  const lab = await db.labProfile.findUnique({ where: { id: body.labId } })
  if (!lab) return jsonError('Lab not found', 404)
  if (!lab.verified) return jsonError('Lab is not verified', 403)

  const patient = await db.user.findUnique({ where: { id: patientId } })
  if (!patient) return jsonError('Patient not found', 404)

  const tests = Array.isArray(body.tests) ? body.tests.filter((t: any) => t && t.name && Number(t.price) > 0) : []
  const total = tests.reduce((s, t) => s + (Number(t.price) || 0), 0)
  if (total <= 0) return jsonError('Total price must be greater than 0', 400)

  // BUSINESS LOGIC: use loyalty-tier-aware commission
  const labTier = resolveTier(lab.reviewCount) // reviewCount as proxy for lifetime fulfilled
  const feePct = effectiveFeePct(LAB_BASE_FEE_PCT, labTier)
  const commission = Math.round(total * (feePct / 100))

  const booking = await db.labBooking.create({
    data: {
      labId: lab.id,
      patientId: patient.id,
      scheduledAt: new Date(body.scheduledAt),
      status: 'pending',
      price: total,
      commission,
      homeCollection: !!body.homeCollection,
      tests: JSON.stringify(tests),
    },
  })

  // Create payment record for lab booking
  try {
    await db.payment.create({
      data: {
        userId: patient.id,
        amount: total,
        currency: 'USD',
        type: 'lab_booking',
        status: 'succeeded',
        provider: 'mock',
        description: `Lab test: ${tests.map((t: any) => t.name).join(', ')} at ${lab.labName}`,
      },
    })
  } catch (paymentErr) {
    logger.phiSafeError(paymentErr, 'lab-bookings.payment.create')
  }

  await logAudit(u.id, 'lab-bookings.book', `booking=${booking.id} lab=${lab.id} commission=${commission} feePct=${feePct}%`)

  // Notify the lab that a new booking was made
  try {
    await sendNotification(
      { userId: lab.userId },
      {
        title: 'New lab test booking',
        body: `${patient.name} booked ${tests.length > 1 ? `${tests.length} tests` : tests[0]?.name} for ${new Date(body.scheduledAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}.`,
        type: 'lab_booking',
        data: { bookingId: booking.id, labId: lab.id, patientId: patient.id },
      },
    )
  } catch { /* best-effort */ }

  return jsonOk({
    id: booking.id,
    labId: booking.labId,
    patientId: booking.patientId,
    scheduledAt: booking.scheduledAt.toISOString(),
    status: booking.status,
    price: booking.price,
    commission: booking.commission,
    commissionRatePct: feePct,
    tests: parseJsonCol(booking.tests, []),
    homeCollection: booking.homeCollection,
  })
}

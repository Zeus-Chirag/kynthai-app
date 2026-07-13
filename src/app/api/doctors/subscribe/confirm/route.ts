import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { sanitizeText, rateLimit } from '@/lib/security'
import { requireAuth, requireAuthWithCsrf, jsonError, jsonOk, readJson, audit } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

// POST /api/doctors/subscribe/confirm
export async function POST(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!
  const u = user!
  if (u.role !== 'doctor') return jsonError('Only doctors may confirm subscription', 403)

  try {
    const body = await readJson<{ paymentId?: string; providerRef?: string }>(req)
    if (!body) return jsonError('Invalid JSON', 400)
    if (!body.paymentId) return jsonError('paymentId is required', 400)

    const payment = await db.payment.findUnique({ where: { id: body.paymentId } })
    if (!payment) return jsonError('Payment not found', 404)
    if (payment.userId !== u.id) return jsonError('Forbidden — payment belongs to another user', 403)
    if (payment.status === 'succeeded') return jsonError('Payment already confirmed', 409)

    // SECURITY: payment confirmation must ONLY come from the Stripe webhook handler
    // in production. Client-side confirmation is STRICTLY rejected in production
    // — otherwise any doctor can escalate to Pro tier for free.
    //
    // Stripe webhook at /api/stripe/webhook is the sole source of truth.
    if (process.env.NODE_ENV === 'production') {
      return jsonError('Payment is being confirmed automatically. Refresh your dashboard shortly.', 400)
    }

    if (payment.provider === 'stripe') {
      // Stripe payments should ONLY be confirmed by the webhook handler.
      return jsonError('Stripe payments are confirmed by webhook. Do not call this endpoint.', 400)
    }

    // Non-production: only allow mock confirmation within 30 minutes of creation.
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)
    if (payment.createdAt < thirtyMinAgo) {
      return jsonError('Payment confirmation window expired. Please retry.', 410)
    }

    const updated = await db.payment.update({
      where: { id: payment.id },
      data: {
        status: 'succeeded',
        providerRef: sanitizeText(body.providerRef, 100) || `mock_${Date.now()}`,
      },
    })

    const renews = new Date()
    renews.setFullYear(renews.getFullYear() + 1)

    await db.doctorProfile.update({
      where: { userId: u.id },
      data: { subscriptionTier: 'pro', subscriptionRenews: renews },
    })

    await logAudit(u.id, 'doctor.subscribe.confirm', `payment=${payment.id}`)
    return jsonOk({
      success: true,
      payment: updated,
      tier: 'pro',
      renewsAt: renews.toISOString(),
    })
  } catch (error) {
    logger.phiSafeError(error)
    return jsonError('Internal server error', 500)
  }
}

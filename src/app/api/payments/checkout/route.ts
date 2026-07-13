import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { sanitizeText, rateLimit } from '@/lib/security'
import { requireAuth, requireAuthWithCsrf, jsonError, jsonOk, readJson, audit } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

// POST /api/payments/checkout
export async function POST(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!
  const u = user!

  try {
    const body = await readJson<{ paymentId?: string; providerRef?: string }>(req)
    if (!body?.paymentId) return jsonError('paymentId is required', 400)

    const payment = await db.payment.findUnique({ where: { id: body.paymentId } })
    if (!payment) return jsonError('Payment not found', 404)
    if (payment.userId !== u.id) return jsonError('Forbidden — payment belongs to another user', 403)
    if (payment.status === 'succeeded') return jsonError('Payment already confirmed', 409)

    // SECURITY: never trust a client-supplied providerRef in production. Until
    // Stripe is wired up (mock provider is the default), confirming mock
    // payments in production would let any user upgrade their tier for free.
    // Stripe webhook handler at /api/stripe/webhook — confirm payments server-side
    if (process.env.NODE_ENV === 'production' && payment.provider === 'mock') {
      return jsonError('Mock payments cannot be confirmed in production. Configure STRIPE_SECRET_KEY.', 403)
    }

    // With webhook confirmation, status is updated server-side by Stripe.
    // We only persist the providerRef here; the payment remains pending
    // until payment_intent.succeeded is received by the webhook.
    const updated = await db.payment.update({
      where: { id: payment.id },
      data: { providerRef: sanitizeText(body.providerRef, 100) || `mock_ref_${payment.id}` },
    })

    await logAudit(u.id, 'payment.confirm', `payment=${payment.id}`)
    return jsonOk({
      success: true,
      payment: updated,
    })
  } catch (error) {
    logger.phiSafeError(error, 'payments.checkout')
    return jsonError('Internal server error', 500)
  }
}

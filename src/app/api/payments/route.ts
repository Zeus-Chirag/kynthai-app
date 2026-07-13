import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { sanitizeText, rateLimit } from '@/lib/security'
import { requireAuth, requireAuthWithCsrf, jsonError, jsonOk, readJson, audit } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

// POST /api/payments
export async function POST(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!
  const u = user!

  try {
    const body = await readJson<{
      type?: string
      amount?: number
      currency?: string
      description?: string
      provider?: string
    }>(req)
    if (!body) return jsonError('Invalid JSON', 400)
    if (!body.amount || Number(body.amount) <= 0) return jsonError('Valid amount is required', 400)
    if (Number(body.amount) > 1_000_000) return jsonError('Amount exceeds maximum allowed', 400)

    // SECURITY: prevent double-charge — check for recent pending payment
    const recentPending = await db.payment.findFirst({
      where: {
        userId: u.id,
        status: 'pending',
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
      },
      orderBy: { createdAt: 'desc' },
    })

    if (recentPending) {
      // Return existing pending payment instead of creating duplicate
      return jsonOk({
        paymentId: recentPending.id,
        amount: recentPending.amount,
        currency: recentPending.currency,
        clientSecret: `mock_existing_${recentPending.id}`,
        status: recentPending.status,
        duplicate: true,
      })
    }

    // SECURITY: provider is determined server-side only — never trust client input.
    const isProduction = process.env.NODE_ENV === 'production'
    const provider = isProduction ? 'stripe' : 'mock'

    if (!isProduction && body.provider && body.provider !== 'mock') {
      return jsonError('Provider must be mock in non-production', 400)
    }

    const payment = await db.payment.create({
      data: {
        userId: u.id,
        type: sanitizeText(body.type, 60) || 'generic',
        amount: Number(body.amount),
        currency: sanitizeText(body.currency, 5) || 'USD', // US-first: default USD
        status: 'pending',
        provider,
        description: sanitizeText(body.description, 300),
      },
    })

    await logAudit(u.id, 'payment.create', `payment=${payment.id} amount=${payment.amount}`)

    // If Stripe is configured, create a real PaymentIntent
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (stripeSecretKey && /^sk_(live|test)_[A-Za-z0-9]{24,}$/.test(stripeSecretKey)) {
      try {
        const Stripe = (await import('stripe')).default
        const stripe = new Stripe(stripeSecretKey)

        // Create a Stripe Customer if not already linked
        let customerId = u.stripeCustomerId
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: u.email,
            name: u.name ?? '',
            metadata: { userId: u.id },
          })
          customerId = customer.id
          await db.user.update({
            where: { id: u.id },
            data: { stripeCustomerId: customerId },
          })
        }

        // Use idempotency key to prevent duplicate charges
        const idempotencyKey = `payment_${payment.id}`

        const intent = await stripe.paymentIntents.create({
          amount: Number(body.amount) * 100,
          currency: (body.currency || 'USD').toLowerCase(),
          customer: customerId,
          metadata: {
            paymentId: payment.id,
            userId: u.id,
            tier: body.type || 'subscription',
          },
          description: sanitizeText(body.description, 300) || 'Kyntha.com subscription',
        }, {
          idempotencyKey,
        })

        // Update payment with Stripe reference
        await db.payment.update({
          where: { id: payment.id },
          data: { provider: 'stripe', providerRef: intent.id },
        })

        return jsonOk({
          paymentId: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          clientSecret: intent.client_secret,
          status: payment.status,
        })
      } catch (stripeError) {
        // HIPAA: never log Stripe error details (may contain payment IDs, amounts)
        logger.phiSafeError(stripeError, 'payments.stripe_intent')
        // Mark payment as failed
        await db.payment.update({
          where: { id: payment.id },
          data: { status: 'failed' },
        })
        if (isProduction) {
          return jsonError('Payment processing failed. Please try again.', 502)
        }
        // Non-production: fall through to mock mode
      }
    }

    // Mock mode (dev/test) — returns a fake client secret
    return jsonOk({
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      clientSecret: `mock_secret_${payment.id}`,
      status: payment.status,
    })
  } catch (error) {
    // HIPAA: never log raw DB errors or payment amounts
    logger.phiSafeError(error, 'payments.POST')
    return jsonError('Internal server error', 500)
  }
}

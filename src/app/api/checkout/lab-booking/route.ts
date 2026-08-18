/**
 * POST /api/checkout/lab-booking
 *
 * Creates a Stripe Checkout Session for a lab booking (tests + delivery fee).
 * Returns { sessionId, url } for redirect-based checkout.
 *
 * Requires: STRIPE_SECRET_KEY in env.
 */
import { NextRequest } from 'next/server'
import { requireAuthWithCsrf, jsonError, jsonOk, readJson } from '@/lib/api-helpers'
import { rateLimit } from '@/lib/security'
import { logger } from '@/lib/logger'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kynthai.app'

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key, { apiVersion: '2025-06-30.basil' as any })
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!

  const body = await readJson<{
    bookingId?: string
    tests?: Array<{ name: string; price: number }>
    deliveryFee?: number       // cents
    platformFee?: number       // cents
    labName?: string
    deliveryAddress?: string
  }>(req)

  if (!body) return jsonError('Invalid JSON', 400)
  if (!body.bookingId) return jsonError('bookingId is required', 400)
  if (!body.tests || body.tests.length === 0) return jsonError('tests are required', 400)

  const stripe = getStripe()
  if (!stripe) {
    // Stripe not configured — create a mock payment record and confirm the booking
    return jsonOk({
      sessionId: null,
      url: null,
      mockMode: true,
      message: 'Stripe not configured — booking confirmed without payment.',
    })
  }

  const testsTotal = body.tests.reduce((s, t) => s + (t.price || 0), 0)
  const deliveryFee = body.deliveryFee || 0
  const platformFee = body.platformFee || 0
  const totalCents = testsTotal + deliveryFee

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email || undefined,
      line_items: [
        // Test fees
        ...body.tests.map((t) => ({
          price_data: {
            currency: 'usd',
            product_data: {
              name: t.name,
              description: `Lab test at ${body.labName || 'Kynthai partner lab'}`,
            },
            unit_amount: t.price,
          },
          quantity: 1,
        })),
        // Delivery fee (if any)
        ...(deliveryFee > 0
          ? [{
              price_data: {
                currency: 'usd',
                product_data: {
                  name: 'Home collection delivery',
                  description: `Delivery to ${body.deliveryAddress || 'your address'}`,
                },
                unit_amount: deliveryFee,
              },
              quantity: 1,
            }]
          : []),
      ],
      metadata: {
        bookingId: body.bookingId,
        userId: user.id,
        deliveryFee: String(deliveryFee),
        platformFee: String(platformFee),
      },
      success_url: `${APP_URL}/patient?booking=success&id=${body.bookingId}`,
      cancel_url: `${APP_URL}/patient?booking=cancelled&id=${body.bookingId}`,
    })

    return jsonOk({
      sessionId: session.id,
      url: session.url,
    })
  } catch (err: any) {
    logger.error('stripe-checkout.error', { message: err?.message })
    return jsonError('Failed to create checkout session', 500)
  }
}

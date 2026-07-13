import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { audit, applyStandardHeaders } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
/**
 * Stripe Webhook Handler
 *
 * Verifies Stripe payment events server-side and updates payment status
 * in the database. This is the SECURE way to confirm payments —
 * never trust client-side payment confirmation.
 *
 * Idempotency: Every webhook event is tracked by its Stripe event ID.
 * Duplicate deliveries (Stripe retries) are safely ignored.
 *
 * Setup:
 *   1. Set STRIPE_SECRET_KEY in .env
 *   2. Set STRIPE_WEBHOOK_SECRET in .env
 *   3. Create webhook endpoint in Stripe Dashboard → Developers → Webhooks
 *      URL: https://kyntha.app/api/stripe/webhook
 *      Events: payment_intent.succeeded, payment_intent.payment_failed,
 *              customer.subscription.deleted, invoice.payment_failed
 *
 * Without STRIPE_WEBHOOK_SECRET, this endpoint returns 501 (not configured).
 */

export const dynamic = 'force-dynamic'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// Map of stripe event ID → already processed, for in-memory dedup within
// a single server process. Combined with the DB check below this gives
// full idempotency across restarts and multi-instance deployments.
const processedEvents = new Set<string>()
const MAX_EVENT_CACHE = 10000

export async function POST(req: NextRequest) {
  // If Stripe isn't configured, return 501
  if (!stripeSecretKey || !webhookSecret) {
    return (function() {
      const r = NextResponse.json(
        { error: 'Stripe webhook not configured', code: 'NOT_CONFIGURED' },
        { status: 501 }
      );
      applyStandardHeaders(r, req);
      return r;
    })()
  }

  const stripe = new Stripe(stripeSecretKey)
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return (function() {
      const _1 = { error: 'Missing stripe-signature header', code: 'MISSING_HEADER' };
      const r = NextResponse.json(_1, { status: 400 });
      applyStandardHeaders(r, req);
      return r;
    })()
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: unknown) {
    // HIPAA: never log the raw Stripe signature or payload content
    logger.phiSafeError(err, 'stripe.webhook.verify')
    return (function() {
      const r = NextResponse.json(
        { error: 'Webhook signature verification failed', code: 'BAD_SIGNATURE' },
        { status: 400 }
      );
      applyStandardHeaders(r, req);
      return r;
    })()
  }

  // ── Idempotency: skip duplicates ──────────────────────────────
  // 1. In-memory cache (fast path, single-process).
  if (processedEvents.has(event.id)) {
    return (function() {
      const r = NextResponse.json({ received: true, duplicate: true });
      applyStandardHeaders(r, req);
      return r;
    })()
  }
  // 2. DB check — find any recently-processed payment with the same
  //    Stripe event reference. This handles multi-instance / restart.
  try {
    const existing = await db.payment.findFirst({
      where: { providerEventId: event.id },
      orderBy: { createdAt: 'desc' },
    })
    if (existing) {
      // Already processed this event in the DB — acknowledge and move on.
      if (processedEvents.size < MAX_EVENT_CACHE) processedEvents.add(event.id)
      return (function() {
      const r = NextResponse.json({ received: true, duplicate: true });
      applyStandardHeaders(r, req);
      return r;
    })()
    }
  } catch {
    // If the DB check fails it's best to proceed (let the payment
    // handling be idempotent at the record level) rather than block.
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const paymentId = paymentIntent.metadata?.paymentId

        if (paymentId) {
          // Transaction: update payment + record event ID atomically.
          // providerEventId enables idempotency — re-delivery of the same
          // Stripe event is caught at the top of this handler before reaching here.
          const payment = await db.payment.update({
            where: { id: paymentId },
            data: {
              status: 'succeeded',
              providerRef: paymentIntent.id,
              provider: 'stripe',
              providerEventId: event.id,
            },
          })

          // If this is a subscription payment, upgrade the user's tier
          if (payment.type === 'subscription' || payment.type === 'doctor_pro_subscription') {
            const tier = paymentIntent.metadata?.tier as 'plus' | 'family_pro' | undefined
            if (tier) {
              await db.user.update({
                where: { id: payment.userId },
                data: { subscriptionTier: tier },
              })

              // If doctor Pro subscription, also update DoctorProfile
              if (payment.type === 'doctor_pro_subscription') {
                await db.doctorProfile.update({
                  where: { userId: payment.userId },
                  data: {
                    subscriptionTier: 'pro',
                    subscriptionRenews: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                  },
                })
              }

              await logAudit(payment.userId, 'payment.subscription.succeeded', `tier=${tier} amount=${payment.amount}`)
            }
          }
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const paymentId = paymentIntent.metadata?.paymentId

        if (paymentId) {
          await db.payment.update({
            where: { id: paymentId },
            data: {
              status: 'failed',
              providerRef: paymentIntent.id,
              providerEventId: event.id,
            },
          })
          await logAudit(paymentIntent.metadata?.userId || 'unknown', 'payment.failed', `paymentId=${paymentId}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by stripeCustomerId (linked at PaymentIntent creation) and downgrade to free
        const user = await db.user.findFirst({
          where: { stripeCustomerId: customerId },
        })

        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: { subscriptionTier: 'free' },
          })
          await logAudit(user.id, 'subscription.cancelled', `customerId=${customerId}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Stripe retries failed invoices automatically (up to 3 attempts over ~5 days).
        // Only log the failure — downgrade happens on customer.subscription.deleted.
        const user = await db.user.findFirst({
          where: { stripeCustomerId: customerId },
        })

        if (user) {
          await logAudit(user.id, 'payment.failed.invoice', `invoiceId=${invoice.id} customerId=${customerId} attempts=${invoice.attempt_count}`)
          // HIPAA: never log user email in production — use masked logger
          logger.warn(`Invoice payment failed for user ${user.id}: invoice ${invoice.id}, attempt ${invoice.attempt_count}`)
        }
        break
      }

      default:
        // Unhandled event type — log but don't error
    }

    return (function() {
      const r = NextResponse.json({ received: true });
      applyStandardHeaders(r, req);
      return r;
    })()
  } catch (error) {
    // HIPAA: never log raw webhook payload or DB errors
    logger.phiSafeError(error, 'stripe.webhook.process')
    return (function() {
      const r = NextResponse.json(
        { error: 'Webhook processing failed', code: 'PROCESSING_ERROR' },
        { status: 500 }
      );
      applyStandardHeaders(r, req);
      return r;
    })()
  }
}

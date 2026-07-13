import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { requireAuth, requireAuthWithCsrf, jsonError, jsonOk, audit } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

async function getStripe() {
  if (typeof (globalThis as any).Stripe === 'function') {
    return new (globalThis as any).Stripe(STRIPE_SECRET_KEY)
  }
  // Dynamic import avoids bundler issues when SDK is optional.
  const stripeModule = await import('stripe')
  const Stripe = (stripeModule as any).default || (stripeModule as any)
  return new Stripe(STRIPE_SECRET_KEY)
}

export async function POST(req: NextRequest) {
  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!
  const u = user

  if (!u.stripeCustomerId) {
    return jsonError('No active subscription found for this account.', 404, 'NO_SUBSCRIPTION')
  }

  try {
    if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY === 'sk_test_...' || STRIPE_SECRET_KEY === 'sk_live_...') {
      await db.user.update({ where: { id: u.id }, data: { subscriptionTier: 'free', stripeCustomerId: null } })
      await logAudit(u.id, 'subscription.cancel', 'mock_no_stripe_key')
      return jsonOk({ cancelled: true, method: 'mock' })
    }

    const stripe = await getStripe()
    const customerSubs = await stripe.subscriptions.list({ customer: u.stripeCustomerId, status: 'active', limit: 1 })
    const active = customerSubs.data[0]
    if (!active) {
      await db.user.update({ where: { id: u.id }, data: { subscriptionTier: 'free', stripeCustomerId: null } })
      await logAudit(u.id, 'subscription.cancel', 'no_active_sub')
      return jsonOk({ cancelled: true, method: 'local' })
    }

    await stripe.subscriptions.cancel(active.id)
    await db.user.update({ where: { id: u.id }, data: { subscriptionTier: 'free', stripeCustomerId: null } })
    await logAudit(u.id, 'subscription.cancel', `stripe_sub=${active.id}`)
    return jsonOk({ cancelled: true, method: 'stripe' })
  } catch (error) {
    logger.phiSafeError(error)
    return jsonError('Failed to cancel subscription. Please contact support.', 500, 'CANCEL_FAILED')
  }
}

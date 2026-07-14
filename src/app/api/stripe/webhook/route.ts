import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// POST /api/stripe/webhook
// Source of truth for payment status — handles payment_intent.succeeded,
// payment_intent.payment_failed, and subscription lifecycle events.
export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-06-24.dahlia',
  });

  const sig = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (!sig) return jsonError('Missing Stripe signature', 400);
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    logger.phiSafeError(err, 'stripe.webhook.verify');
    return jsonError('Invalid webhook signature', 400);
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentSucceeded(intent);
      break;
    }
    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailed(intent);
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(sub);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(sub);
      break;
    }
    default:
      logger.info(`Unhandled Stripe event: ${event.type}`);
  }

  return jsonOk({ received: true });
}

async function handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
  const userId = intent.metadata.userId;
  if (!userId) {
    logger.warn(`Stripe PaymentIntent ${intent.id} missing userId in metadata`);
    return;
  }

  const payment = await db.payment.findFirst({
    where: { providerRef: intent.id, userId },
    orderBy: { createdAt: 'desc' },
  });

  if (payment && payment.status !== 'succeeded') {
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: 'succeeded',
        provider: 'stripe',
        amount: intent.amount / 100,
        currency: intent.currency.toUpperCase(),
      },
    });

    // Upgrade user tier on successful payment
    const tier = intent.metadata.tier || 'plus';
    const newTier = tier === 'family' ? 'family_pro' : 'plus';
    await db.user.update({
      where: { id: userId },
      data: { subscriptionTier: newTier },
    });

    await logAudit(userId, 'payment.succeeded', `payment=${payment.id} amount=${intent.amount / 100}`);
  }
}

async function handlePaymentFailed(intent: Stripe.PaymentIntent) {
  const userId = intent.metadata.userId;
  if (!userId) return;

  const payment = await db.payment.findFirst({
    where: { providerRef: intent.id, userId },
    orderBy: { createdAt: 'desc' },
  });

  if (payment) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: 'failed' },
    });
    await logAudit(userId, 'payment.failed', `payment=${payment.id}`);
  }
}

async function handleSubscriptionUpdate(sub: Stripe.Subscription) {
  const userId = sub.metadata.userId;
  if (!userId) return;

  const tier = sub.items.data[0]?.price?.metadata?.tier;
  if (!tier) return;

  const newTier = tier === 'family' ? 'family_pro' : 'plus';
  await db.user.update({
    where: { id: userId },
    data: { subscriptionTier: newTier },
  });

  await logAudit(userId, 'subscription.updated', `tier=${newTier} status=${sub.status}`);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const userId = sub.metadata.userId;
  if (!userId) return;

  await db.user.update({
    where: { id: userId },
    data: { subscriptionTier: 'free' },
  });

  await logAudit(userId, 'subscription.cancelled', 'subscription_cancelled');
}

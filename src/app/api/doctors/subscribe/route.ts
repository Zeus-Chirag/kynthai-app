import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/auth';
import { sanitizeText, rateLimit } from '@/lib/security';
import {
  requireAuth,
  requireAuthWithCsrf,
  jsonError,
  jsonOk,
  readJson,
  audit,
} from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
export const dynamic = 'force-dynamic';

// POST /api/doctors/subscribe
export async function POST(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const { response, user } = await requireAuthWithCsrf(req);
  if (response || !user) return response!;
  const u = user!;
  if (u.role !== 'doctor') return jsonError('Only doctors may subscribe', 403);

  try {
    const body = await readJson<{ plan?: string; amount?: number; currency?: string }>(req);
    if (!body) return jsonError('Invalid JSON', 400);

    const plan = sanitizeText(body.plan, 20) || 'pro';
    if (plan !== 'pro') return jsonError('Only "pro" plan supported', 400);

    // SECURITY: clamp amount to a sane range to prevent negative/huge values.
    const rawAmount = Number(body.amount) || 5000; // $50/month in cents
    if (rawAmount <= 0 || rawAmount > 1_000_000) {
      return jsonError('Amount must be between 1 and 1,000,000', 400);
    }
    const amount = Math.round(rawAmount);
    const currency = sanitizeText(body.currency, 5) || 'USD';

    const profile = await db.doctorProfile.findUnique({ where: { userId: u.id } });
    if (!profile) return jsonError('Doctor profile not found. Submit verification first.', 404);
    if (!profile.verified) return jsonError('Only verified doctors may subscribe to Pro', 403);

    // SECURITY: provider is determined server-side only — never trust client input.
    const isProduction = process.env.NODE_ENV === 'production';
    const provider = isProduction ? 'stripe' : 'mock';

    const payment = await db.payment.create({
      data: {
        userId: u.id,
        type: 'doctor_pro_subscription',
        amount,
        currency,
        status: 'pending',
        provider,
        description: `Kynthai Pro doctor subscription (${plan})`,
      },
    });

    // If Stripe is configured, create a real PaymentIntent
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (stripeSecretKey && /^sk_(live|test)_[A-Za-z0-9]{24,}$/.test(stripeSecretKey)) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(stripeSecretKey);

        let customerId = u.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: u.email,
            name: u.name ?? '',
            metadata: { userId: u.id },
          });
          customerId = customer.id;
          await db.user.update({ where: { id: u.id }, data: { stripeCustomerId: customerId } });
        }

        const idempotencyKey = `subscribe_${u.id}_${plan}`;
        const intent = await stripe.paymentIntents.create(
          {
            amount, // Amount in minor units (cents for USD)
            currency: currency.toLowerCase(),
            customer: customerId,
            metadata: { paymentId: payment.id, userId: u.id, tier: plan },
            description: `Kynthai Pro doctor subscription (${plan})`,
          },
          { idempotencyKey }
        );

        await db.payment.update({
          where: { id: payment.id },
          data: { provider: 'stripe', providerRef: intent.id },
        });

        return jsonOk({
          paymentId: payment.id,
          amount,
          currency,
          clientSecret: intent.client_secret,
          status: 'pending',
        });
      } catch (stripeError) {
        logger.phiSafeError(stripeError, 'doctors.subscribe.stripe');
        await db.payment.update({ where: { id: payment.id }, data: { status: 'failed' } });
        if (isProduction) return jsonError('Payment processing failed. Please try again.', 502);
      }
    }

    // Mock mode (dev/test)
    await logAudit(
      u.id,
      'doctor.subscribe.init',
      `payment=${payment.id} amount=${amount} currency=${currency}`
    );
    return jsonOk({
      paymentId: payment.id,
      amount,
      currency,
      clientSecret: `mock_secret_${payment.id}`,
      status: 'pending',
    });
  } catch (error) {
    logger.phiSafeError(error);
    return jsonError('Internal server error', 500);
  }
}

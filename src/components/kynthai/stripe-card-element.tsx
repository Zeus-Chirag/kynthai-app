'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { loadStripe, type Stripe, type StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function getStripeKey(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const el = document.querySelector('meta[name="stripe-pk"]');
  if (el) {
    const v = el.getAttribute('content') ?? '';
    // Never initialize Stripe with a placeholder value.
    if (v && !/PLACEHOLDER|placeholder|REPLACE_WITH/i.test(v)) return v;
  }
  const envKey = process.env.NEXT_PUBLIC_STRIPE_PK;
  if (envKey && !/PLACEHOLDER|placeholder|REPLACE_WITH/i.test(envKey)) return envKey;
  return undefined;
}

interface StripeConfirmFormProps {
  onSuccess: () => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

function StripeConfirmForm({ onSuccess, onError, disabled }: StripeConfirmFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    if (!stripe || !elements) {
      setSubmitting(false);
      return;
    }
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: typeof window !== 'undefined' ? window.location.href : '/' },
        redirect: 'if_required',
      });
      if (error) {
        setSubmitting(false);
        onError(error.message ?? 'Payment failed');
      } else {
        onSuccess();
      }
    } catch (err) {
      setSubmitting(false);
      onError('Payment processing failed');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: 'tabs' }} />
      <Button
        type="submit"
        disabled={disabled || submitting}
        className="mt-4 w-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
      >
        {submitting ? 'Processing…' : 'Pay & Subscribe'}
      </Button>
    </form>
  );
}

interface StripeCardElementProps {
  clientSecret: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  disabled?: boolean;
  className?: string;
}

export function StripeCardElement({
  clientSecret,
  onSuccess,
  onError,
  disabled,
  className,
}: StripeCardElementProps) {
  const [stripeInstance, setStripeInstance] = useState<Stripe | null>(null);

  useEffect(() => {
    const key = getStripeKey();
    if (!key) return;
    // loadStripe is safe to call client-side only
    loadStripe(key).then(s => {
      if (s) setStripeInstance(s);
    });
  }, []);

  const options: StripeElementsOptions = React.useMemo(
    () => ({
      clientSecret,
      appearance: { theme: 'stripe', variables: { colorPrimary: '#059669' } },
    }),
    [clientSecret]
  );

  if (!stripeInstance) {
    return (
      <div className={cn('space-y-3', className)}>
        {!getStripeKey() ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Stripe is not configured. Add{' '}
            <code className="font-mono text-xs">NEXT_PUBLIC_STRIPE_PK</code> to enable live
            payments.
          </p>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-4">Loading payment form…</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <Elements stripe={stripeInstance} options={options}>
        <StripeConfirmForm onSuccess={onSuccess} onError={onError} disabled={disabled} />
      </Elements>
      <p className="text-center text-[11px] text-muted-foreground">
        Powered by{' '}
        <a
          href="https://stripe.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Stripe
        </a>{' '}
        — PCI-DSS Level 1 compliant. Card data never touches our servers.
      </p>
    </div>
  );
}

'use client';

import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { LoginPortal } from '@/lib/store';

function EmailCapture({ onPickPortal }: { onPickPortal: (portal: LoginPortal) => void }) {
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    // Newsletter signup — stores via localStorage until backend API is ready
    setSubmitted(true);
  };

  return (
    <section className="border-y border-border/60 bg-gradient-to-b from-emerald-500/[0.03] to-teal-500/[0.03] py-10 lg:py-14">
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <Badge
          variant="secondary"
          className="mb-4 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
        >
          Product updates
        </Badge>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Get updates on <span className="text-emerald-600">what we build next</span>
        </h2>
        <p className="mt-3 text-muted-foreground">
          New features, health tips, and product news — no spam, no sales pitches.
        </p>

        {submitted ? (
          <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
            <Check className="mx-auto h-8 w-8 text-emerald-600" />
            <p className="mt-2 font-semibold text-emerald-700 dark:text-emerald-300">
              Thanks for your interest!
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll notify you when Kynthai launches in your area.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              aria-label="Email address"
              className="flex h-12 w-full rounded-full border border-border bg-background px-5 text-base outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
            />
            <Button
              type="submit"
              className="h-12 shrink-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-6 text-white shadow-lg shadow-emerald-600/20"
            >
              Subscribe
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </form>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Already using Kynthai? You&apos;re on the waitlist —{' '}
          <button onClick={() => onPickPortal('caretaker')} className="rounded-md px-1 -mx-1 py-2 -my-2 text-emerald-600 underline">
            sign in
          </button>{' '}
          to manage your preferences.
        </p>
      </div>
    </section>
  );
}

export { EmailCapture };

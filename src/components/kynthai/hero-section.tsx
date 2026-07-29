'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { PhoneMockup } from './phone-mockup';

interface HeroSectionProps {
  onGetStarted: (portal?: string) => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Multi-layer soft gradient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div
          className="absolute -top-48 left-1/2 h-[44rem] w-[44rem] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{
            background: 'radial-gradient(closest-side, rgba(16,185,129,0.32), transparent 70%)',
          }}
        />
        <div
          className="absolute -top-20 -left-48 h-[26rem] w-[26rem] rounded-full opacity-40 blur-3xl"
          style={{
            background: 'radial-gradient(closest-side, rgba(13,148,136,0.32), transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full opacity-35 blur-3xl"
          style={{
            background: 'radial-gradient(closest-side, rgba(16,185,129,0.22), transparent 70%)',
          }}
        />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-6 lg:px-8 lg:py-16">
        {/* Left: copy column */}
        <div>
          {/* Trust badge */}
          <div>
            <Badge
              variant="secondary"
              className="mb-3 sm:mb-4 gap-1.5 border-emerald-500/35 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-medium text-[11px] sm:text-sm"
            >
              <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Built for the US · Privacy-first · Secure billing
            </Badge>
          </div>

          {/* H1 — dominant, high-contrast */}
          <h1 className="text-balance text-[2rem] leading-[1.08] font-bold tracking-tight sm:text-5xl lg:text-[3.7rem]">
            America&apos;s AI health companion
            <br />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
              for every member of your family.
            </span>
          </h1>

          {/* Gradient subline — higher visual rank than plain text */}
          <p className="mt-3 text-base font-semibold sm:mt-4 sm:text-xl lg:text-2xl">
            <span className="bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
              Smart reminders, verified doctors &amp; lab tests
            </span>
            <span className="text-foreground"> — all in one trusted app.</span>
          </p>

          {/* Body copy — relaxed leading, muted opacity */}
          <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-foreground/75 sm:mt-3 sm:text-base lg:text-lg">
            Missed doses, confusing labels, scheduling headaches — Kynthai brings smart reminders,
            AI-guided medication information, verified consults, and home diagnostic tests together.
            Built in the US, for US families, in USD, with Privacy-first safeguards.
          </p>

          {/* CTA buttons */}
          <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:items-center sm:gap-3">
            <Button
              size="lg"
              onClick={() => onGetStarted('caretaker')}
              className="h-11 min-h-11 w-full gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-6 text-sm font-semibold shadow-lg shadow-emerald-600/25 hover:from-emerald-600 hover:to-teal-700 sm:h-12 sm:w-auto sm:px-7 sm:text-base"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                const el = document.getElementById('how-it-works');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="h-11 w-full rounded-full px-6 text-sm font-semibold sm:h-12 sm:px-7 sm:text-base"
            >
              See How It Works
            </Button>
          </div>

          {/* Trust pill-row */}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-medium text-muted-foreground sm:mt-6 sm:gap-x-5 sm:text-xs">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Privacy-first
            </span>
            <span className="h-1 w-1 rounded-full bg-border" aria-hidden />
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> AI for health info only
            </span>
            <span className="h-1 w-1 rounded-full bg-border" aria-hidden />
            <span className="font-semibold text-foreground">Free to start</span>
            <span className="h-1 w-1 rounded-full bg-border" aria-hidden />
            <span>No credit card required</span>
          </div>
        </div>

        {/* Right: phone mockup — visible on all screens */}
        <div className="flex items-center justify-center mt-4 lg:mt-0">
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}

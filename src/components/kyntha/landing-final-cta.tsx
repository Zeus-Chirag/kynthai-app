'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowRight, DollarSign, ShieldCheck, Bell, Lock } from 'lucide-react'

/* ------------------------------------------------------------------ */
/* LandingFinalCTA — final call-to-action section (client island)     */
/* ------------------------------------------------------------------ */
export function LandingFinalCTA({ onGetStarted }: { onGetStarted: () => void }) {
  const router = useRouter()

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div
        className="relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12 sm:py-20"
        style={{
          background: 'linear-gradient(135deg, #10b981 0%, #0d9488 50%, #0f766e 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4), transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3), transparent 40%)',
          }}
        />
        <div className="relative">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            <DollarSign className="h-3.5 w-3.5" />
            Built for America
          </div>
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Because your family deserves better than forgetting.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-emerald-50">
            Join US families who trust Kyntha. Start free today — no credit card, no commitment.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={onGetStarted}
              className="h-12 w-full rounded-full bg-white px-7 text-emerald-700 shadow-lg hover:bg-emerald-50 sm:w-auto"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push('/pricing')}
              className="h-12 w-full rounded-full border-white/40 bg-white/10 px-6 text-white backdrop-blur hover:bg-white/20 hover:text-white sm:w-auto"
            >
              View Pricing
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/80">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              HIPAA-aligned
            </span>
            <span className="inline-flex items-center gap-1.5">
              <DollarSign className="h-3 w-3" />
              Secure Card Billing
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Bell className="h-3 w-3" />
              Smart Reminders
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              Data encrypted in transit & at rest
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

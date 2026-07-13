'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PhoneMockup } from './phone-mockup'

interface HeroSectionProps {
  onGetStarted: (portal?: string) => void
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Multi-layer soft gradient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div
          className="absolute -top-48 left-1/2 h-[44rem] w-[44rem] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgba(16,185,129,0.32), transparent 70%)' }}
        />
        <div
          className="absolute -top-20 -left-48 h-[26rem] w-[26rem] rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgba(13,148,136,0.32), transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full opacity-35 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgba(16,185,129,0.22), transparent 70%)' }}
        />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-6 lg:px-8 lg:py-28">
        {/* Left: copy column */}
        <div>
          {/* Trust badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <Badge
              variant="secondary"
              className="mb-6 gap-1.5 border-emerald-500/35 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-medium"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Built for America · HIPAA-aligned · Secure billing
            </Badge>
          </motion.div>

          {/* H1 — dominant, high-contrast */}
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="text-balance text-[2.65rem] leading-[1.08] font-bold tracking-tight sm:text-6xl lg:text-[3.7rem]"
          >
            America&apos;s AI health companion
            <br />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
              for every member of your family.
            </span>
          </motion.h1>

          {/* Gradient subline — higher visual rank than plain text */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 text-xl font-semibold sm:text-2xl"
          >
            <span className="bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
              Smart reminders, verified doctors & lab tests
            </span>
            <span className="text-foreground"> — all in one trusted app.</span>
          </motion.p>

          {/* Body copy — relaxed leading, muted opacity */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.26 }}
            className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-foreground/75 sm:text-lg"
          >
            Missed doses, confusing labels, scheduling headaches — Kyntha brings smart reminders, AI-guided medication information, verified consults, and home diagnostic tests together. Built for US households, in USD, with HIPAA-aligned safeguards.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.34 }}
            className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Button
              size="lg"
              onClick={() => onGetStarted('caretaker')}
              className="h-12 min-h-12 w-full gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-7 text-base font-semibold shadow-lg shadow-emerald-600/25 hover:from-emerald-600 hover:to-teal-700 sm:w-auto"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                const el = document.getElementById('how-it-works')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className="h-12 w-full rounded-full px-7 text-base font-semibold"
            >
              See How It Works
            </Button>
          </motion.div>

          {/* Trust pill-row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-xs font-medium text-muted-foreground"
          >
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> HIPAA-aligned
            </span>
            <span className="h-1 w-1 rounded-full bg-border" aria-hidden />
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> AI for health info only
            </span>
            <span className="h-1 w-1 rounded-full bg-border" aria-hidden />
            <span className="font-semibold text-foreground">Free to start</span>
            <span className="h-1 w-1 rounded-full bg-border" aria-hidden />
            <span>No credit card required</span>
          </motion.div>
        </div>

        {/* Right: phone mockup */}
        <div className="hidden lg:flex items-center justify-center">
          <PhoneMockup />
        </div>
      </div>
    </section>
  )
}

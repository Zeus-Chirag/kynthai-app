'use client'

import React from 'react'
import {
  Sparkles,
  Bell,
  AlertTriangle,
  Users,
  Stethoscope,
  ShieldCheck,
  ShieldPlus,
  Scale,
  Server,
  ArrowRight,
  Check,
  HeartPulse,
  Mail,
  Gift,
  Pill,
  Lock,
  FlaskConical,
  Video,
  Camera,
  ShoppingBag,
  Languages,
  Microscope,
  DollarSign,
  Globe,
  Accessibility,
  UserPlus,
  Phone,
  Package,
  ScanSearch,
  Bot,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { PRICING, formatPrice, yearlySavingsPct } from '@/lib/currency'
import { DOCTOR_BASE_FEE_PCT, LAB_BASE_FEE_PCT } from '@/lib/commission'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import type { LoginPortal } from '@/lib/store'
import { KynthaiBrand } from './logo'
import { LandingNav } from './landing-nav'
import { PhoneMockup } from './phone-mockup-wrapper'
import { LandingFooter } from './landing-footer'
import { LandingFinalCTA } from './landing-final-cta'
import { EarlyAdopterBanner } from './early-adopter-banner'
import { EarlyAdopterCard } from './early-adopter-card'
import { HeroSection } from './hero-section'
import { WhyAmericaSection } from './sections/why-america-section'

// AI feature count — update this when adding/removing AI features.
// Matches the AI-related API routes and UI features.
const AI_FEATURE_COUNT = 11

/* ------------------------------------------------------------------ */
/* Proof — stronger, more specific US trust signals                 */
/* ------------------------------------------------------------------ */
function ProofStrip() {
  const items = [
    { emoji: '🔒', label: 'Privacy-first data handling', sub: 'Encrypted in transit & at rest', accent: 'border-emerald-500/30 bg-emerald-500/5' },
    { emoji: '💳', label: 'Cards + Apple / Google Pay', sub: 'No hidden fees — USD pricing', accent: 'border-teal-500/30 bg-teal-500/5' },
    { emoji: '🆓', label: 'Free to start', sub: 'No credit card required', accent: 'border-emerald-500/30 bg-emerald-500/5' },
    { emoji: '✅', label: 'Doctors reviewed', sub: 'License & government ID verified', accent: 'border-teal-500/30 bg-teal-500/5' },
    { emoji: '🇺🇸', label: 'Built for US families', sub: 'Privacy-first · CCPA-compliant', accent: 'border-emerald-500/30 bg-emerald-500/5' },
    { emoji: '🆘', label: 'SOS emergency flow', sub: 'Emergency alert to your contacts', accent: 'border-red-500/20 bg-red-500/3' },
  ]

  return (
    <section className="border-y border-border/60 bg-gradient-to-b from-background via-emerald-50/40 to-background dark:via-emerald-900/10">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.label}
              className={cn(
                'group flex items-start gap-3 rounded-2xl border p-4 transition-all duration-200',
                'hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-900/5',
                item.accent,
              )}
            >
              <span className="text-2xl leading-none" aria-hidden="true">{item.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug text-foreground">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* LandingPage — main export                                          */
/* ------------------------------------------------------------------ */
export interface LandingPageProps {
  onGetStarted: (type?: string) => void
  onPickPortal: (portal: LoginPortal) => void
  currency: string
}

/**
 * LandingPage – Client Component.
 *
 * Receives handlers from PortalClient and wires them into the landing UI.
 */
export function LandingPage({
  onGetStarted,
  onPickPortal,
  currency,
}: LandingPageProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <EarlyAdopterBanner onGetStarted={onGetStarted} />
      <LandingNav goToLogin={onPickPortal} />
      <main id="main-content">
        <HeroSection onGetStarted={onGetStarted} />
        <ProofStrip />
        <TrustStats />
        <BentoFeatures />
        <WhyAmericaSection />
        <HowItWorks />
        <ValueStatements />
        <FounderStory />
        <LaunchCTA onGetStarted={onGetStarted} />
        <HonestSocialProof />
        <UserTypeFeatures onGetStarted={onGetStarted} />

        {/* Early adopter pricing card */}
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-2xl text-center mb-6">
            <Badge
              variant="secondary"
              className="mb-3 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            >
              Founder pricing
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Lock in <span className="text-emerald-600">early pricing</span> forever
            </h2>
            <p className="mt-3 text-muted-foreground">
              Join now and keep our lowest pricing for life. Limited founding member spots available.
            </p>
          </div>
          <div className="mx-auto max-w-3xl">
            <EarlyAdopterCard onSelect={(type) => onGetStarted(type)} />
          </div>
        </section>
        
        <section aria-labelledby="pricing-heading" id="pricing-preview">
          <h2 id="pricing-heading" className="sr-only">Pricing overview</h2>
          <PricingTeaser onGetStarted={onGetStarted} />
        </section>
        <Commission onPick={onPickPortal} />
        <USTrust />
        <section aria-labelledby="faq-heading" id="faq">
          <h2 id="faq-heading" className="sr-only">Frequently asked questions</h2>
          <FAQ />
        </section>
        <LandingFinalCTA onGetStarted={onGetStarted} />
      </main>
      <LandingFooter />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Trust stats — outcome-focused                                       */
/* ------------------------------------------------------------------ */
function TrustStats() {
  const stats: Array<{
    label: string
    value: string
    note?: string
  }> = [
    { label: 'AI-Powered Features', value: '11+', note: 'In Plus plan' },
    { label: 'Medicine Added In', value: '<30s', note: 'AI-assisted' },
    { label: 'Starting Price', value: 'Free', note: 'Forever-free tier' },
    { label: 'Early Adopter', value: '$9/mo', note: 'Limited slots' },
    { label: 'Regular Price', value: '$19/mo', note: 'Billed monthly' },
    { label: 'Family members', value: 'Up to 4', note: 'Single dashboard' },
  ]

  return (
    <section className="relative border-y border-border/60">
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-40 blur-3xl"
        aria-hidden
        style={{ background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.08) 0%, transparent 70%)' }}
      />
      <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-5 px-4 py-8 sm:px-6 sm:gap-7 sm:py-10 lg:grid-cols-6 lg:px-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="group flex flex-col items-center rounded-2xl border border-border/50 bg-card/50 p-5 text-center transition-all duration-200 hover:border-emerald-500/25 hover:bg-emerald-500/[0.04] hover:shadow-lg hover:shadow-emerald-900/5"
          >
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl lg:text-[2.5rem]">
              {s.value}
            </div>
            <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-widest text-foreground/70">
              {s.label}
            </div>
            {s.note && (
              <div className="mt-0.5 text-[10px] font-medium text-emerald-600/90 dark:text-emerald-400/90">
                {s.note}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* How it works — 4-step stepper                                       */
/* ------------------------------------------------------------------ */
function HowItWorks() {
  const steps: Array<{
    icon: React.ComponentType<{ className?: string }>
    title: string
    body: string
  }> = [
    {
      icon: UserPlus,
      title: "Manage Your Family",
      body: "Manage health for up to 4 family members in one app. Each member gets their own health profile.",
    },
    {
      icon: Pill,
      title: "Add Medicines Easily",
      body: "Upload a prescription photo or type a list — AI automatically understands and adds them.",
    },
    {
      icon: Bell,
      title: "Smart Reminders",
      body: "Get intelligent reminders for medications. Send missed-dose alerts to family members.",
    },
    {
      icon: Stethoscope,
      title: "Doctors, Labs & Medicines",
      body: "Video consultations, home lab tests, and medicine delivery — all within the app.",
    },
  ]

  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <Badge
          variant="secondary"
          className="mb-4 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        >
          How it works
        </Badge>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Live in <span className="text-emerald-600">four steps</span>, not four apps.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Sign up in under two minutes. No technical setup, no complicated
          settings — just open the app and start.
        </p>
      </div>

      {/* Step connector line (desktop only) */}
      <div className="pointer-events-none relative mt-6 hidden lg:block" aria-hidden="true">
        <div className="mx-auto max-w-5xl">
          <div
            className="h-px w-full bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent"
            style={{ marginTop: '-3rem' }}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
        {steps.map((s, i) => (
          <div key={s.title} className="group flex h-full">
            <Card className="relative flex w-full flex-col overflow-hidden border-border/60 bg-card transition-all duration-200 hover:-translate-y-1.5 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-900/5">
              {/* Large ghost step number */}
              <div
                className="pointer-events-none absolute -bottom-2 -right-2 select-none text-[6.5rem] font-black leading-none text-emerald-500/[0.04]"
                aria-hidden
              >
                {i + 1}
              </div>
              {/* Step number — small accent */}
              <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {i + 1}
              </div>
              <CardContent className="flex-1 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/20 transition-transform duration-200 group-hover:scale-110">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/85">{s.body}</p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </section>
  )
}

function FeatureStrip() {
  const items = [
    { label: 'Privacy-first', icon: ShieldCheck },
    { label: 'AI-Powered', icon: Sparkles },
    { label: 'Family First', icon: Users },
    { label: 'Smart Reminders', icon: Bell },
    { label: 'US-built', icon: Users },
  ]
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 rounded-2xl border border-emerald-500/15 bg-gradient-to-r from-emerald-500/[0.03] via-card to-emerald-500/[0.03] px-6 py-4 backdrop-blur-sm">
        {items.map((it) => (
          <div
            key={it.label}
            className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-3 py-1.5 text-sm font-medium text-foreground/80 transition-all hover:border-emerald-500/25 hover:text-foreground"
          >
            <it.icon className="h-3.5 w-3.5 text-emerald-600" />
            {it.label}
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Bento features                                                      */
/* ------------------------------------------------------------------ */
function BentoFeatures() {
  return (
    <section id="bento-features" className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      {/* Section background accent */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-50"
        aria-hidden="true"
        style={{ background: 'radial-gradient(ellipse 80% 60% at center, rgba(16,185,129,0.06) 0%, transparent 70%)' }}
      />

      <div className="mx-auto max-w-2xl text-center">
        <Badge
          variant="secondary"
          className="mb-4 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
        >
          Everything in one app
        </Badge>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          <span className="text-emerald-600">{AI_FEATURE_COUNT} AI features</span>, zero clutter.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Ask, snap, type — Kynthai turns everyday moments into
          safer, better-coordinated care for the people you love.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-6 lg:grid-cols-12">
        {/* Big AI chat card */}
        <div className="md:col-span-6 lg:col-span-7">
          <div className="h-full">
            <Card className="relative h-full overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-teal-500/5">
              <div
                className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-40 blur-3xl"
                style={{
                  background:
                    'radial-gradient(closest-side, rgba(16,185,129,0.5), transparent 70%)',
                }}
              />
              <CardContent className="flex flex-col gap-4 p-6 sm:p-8">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/30">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">AI Health Assistant</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Ask about medicines, side effects, interactions and timing.
                    Get answers in plain language — with text output.
                  </p>
                </div>
                <div className="mt-2 rounded-2xl border border-border/60 bg-background/70 p-4">
                  <p className="text-xs text-muted-foreground">You</p>
                  <p className="mt-0.5 text-sm">Can I take this medicine with food?</p>
                  <div className="mt-3 flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <p className="text-sm">
                      Some medicines are easier on the stomach when taken with food.
                      Always follow your doctor&apos;s instructions or the label.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {['Text input', 'Text replies', 'Markdown', 'History'].map((t) => (
                    <Badge key={t} variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                      {t}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right column small cards */}
        <div className="grid gap-4 md:col-span-6 lg:col-span-5">
          <div className="grid grid-cols-2 gap-4">
            <SmallFeature icon={Bell} title="Smart Reminders" body="Adaptive schedules with snooze & streaks." accent="from-emerald-500 to-emerald-600" />
            <SmallFeature icon={Video} title="Video Consults" body="Book consultations with US-licensed doctors in minutes." accent="from-teal-500 to-teal-600" />
            <SmallFeature icon={Camera} title="Identify Meds" body="Snap a pill — AI suggests what it might be (informational only, not a diagnosis)." accent="from-emerald-500 to-teal-600" />
            <SmallFeature icon={ShoppingBag} title="Order Medicines" body="Refills delivered to your door." accent="from-teal-500 to-emerald-600" />
          </div>
          <SmallFeature
            wide
            icon={FlaskConical}
            title="Lab Tests at Home"
            body="Book diagnostics from partner labs. Reports land in your dashboard, auto-shared with your doctor."
            accent="from-emerald-600 to-teal-700"
          />
        </div>

        {/* Interactions wide card */}
        <div className="md:col-span-6 lg:col-span-7">
          <Card className="h-full border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-emerald-500/5">
            <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:p-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-600/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">Drug & Food Interactions</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Kynthai cross-checks every active medication for drug-drug, drug-food and timing
                  conflicts — with severity tags and suggested alternatives (informational only, not medical advice).
                </p>
              </div>
              <Badge variant="outline" className="border-amber-500/30 text-amber-700 dark:text-amber-300">
                Auto-checked
              </Badge>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-6 lg:col-span-5">
          <Card className="h-full border-emerald-500/20">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">Family Care Hub</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Manage up to 4 family members from a single dashboard. Caretakers
                get live adherence updates, missed-dose alerts and weekly AI insights.
              </p>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {['Alex', 'Jordan', 'You', 'Sam'].map((m, i) => (
                  <div
                    key={m}
                    className="rounded-xl border border-border/60 bg-card p-2 text-center"
                  >
                    <div
                      className="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                      style={{
                        background: `linear-gradient(135deg, hsl(${160 + i * 10} 70% 45%), hsl(${175 + i * 6} 70% 40%))`,
                      }}
                    >
                      {m[0]}
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">{m}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-6 lg:col-span-5">
          <Card className="h-full border-emerald-500/20">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">AI Health Insights</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Weekly adherence trends, strengths, concerns, and personalised recommendations.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-6 lg:col-span-7">
          <Card className="h-full border-emerald-500/20">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <ScanSearch className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">Prescription Scanner</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Scan a prescription — AI extracts every medication, dose, frequency, and instructions.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Button variant="outline" size="lg" className="group rounded-full border-border/60 px-8 py-6 text-base hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 hover:shadow-md" onClick={() => document.getElementById('features-anchor')?.scrollIntoView({ behavior: 'smooth' })}>
          See all features
          <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Button>
      </div>
    </section>
  )
}

function SmallFeature({
  icon: Icon,
  title,
  body,
  accent,
  wide,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
  accent: string
  wide?: boolean
}) {
  const DynamicIcon = Icon
  return (
    <div className={wide ? 'h-full' : undefined}>
      <Card className="group h-full border-border/60 bg-card/80 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/25 hover:shadow-lg hover:shadow-emerald-900/5">
        <CardContent className={cn('p-5 sm:p-6', wide && 'flex h-full flex-col justify-between')}>
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-200 group-hover:scale-110',
              accent
            )}
          >
            <DynamicIcon className="h-[18px] w-[18px]" />
          </div>
          <h3 className="mt-3 text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* User Type Features                                                  */
/* ------------------------------------------------------------------ */
function UserTypeFeatures({ onGetStarted }: { onGetStarted: (portal?: string) => void }) {
  const features = [
    {
      id: 'patient' as const,
      title: 'For Patients',
      subtitle: 'Take control of your health',
      icon: Pill,
      bullets: ['Track medications & adherence', 'Book lab tests at home', 'Health journal & trends'],
      accent: 'from-emerald-500 to-emerald-700',
      portal: 'patient',
    },
    {
      id: 'doctor' as const,
      title: 'For Doctors',
      subtitle: 'Verified practitioners only',
      icon: Stethoscope,
      bullets: ['Patient management dashboard', 'Secure video consults', 'Digital prescriptions & notes'],
      accent: 'from-teal-500 to-emerald-600',
      portal: 'doctor',
    },
    {
      id: 'caretaker' as const,
      title: 'For Families',
      subtitle: 'Care for everyone you love',
      icon: Users,
      bullets: ['Up to 4 member profiles', 'Real-time family alerts', 'Shared health reports'],
      accent: 'from-emerald-500 to-teal-600',
      portal: 'caretaker',
    },
    {
      id: 'caretaker-assist' as const,
      title: 'For Caretakers',
      subtitle: 'Coordinate care with ease',
      icon: HeartPulse,
      bullets: ['Missed-dose alert system', 'Care task tracking', 'Health monitoring dashboard'],
      accent: 'from-teal-500 to-teal-700',
      portal: 'caretaker',
    },
  ]

  return (
    <section
      aria-labelledby="features-user-type-heading"
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16"
    >
      <div className="mx-auto max-w-2xl text-center">
        <Badge
          variant="secondary"
          className="mb-3 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        >
          Built for every role
        </Badge>
        <h2
          id="features-user-type-heading"
          className="text-3xl font-bold tracking-tight sm:text-4xl"
        >
          One platform. <span className="text-emerald-600">Four experiences.</span>
        </h2>
        <p className="mt-3 text-muted-foreground">
          Choose how you use Kynthai. Switch between portals anytime from your account settings.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
        {features.map((f) => (
          <div key={f.id} className="flex h-full">
            <Card
              onClick={() => onGetStarted(f.portal)}
              className={cn(
                'group relative flex h-full cursor-pointer flex-col gap-4 overflow-hidden border p-6 transition-all duration-200',
                'hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-900/5',
                f.id === 'caretaker'
                  ? 'border-emerald-500/30 hover:border-emerald-500/50'
                  : 'border-border/60 hover:border-emerald-500/25',
              )}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onGetStarted(f.portal)
                }
              }}
              aria-label={`Enter ${f.title} portal`}
            >
              {/* Decorative spotlight on the caretaker card */}
              {f.id === 'caretaker' && (
                <div
                  className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-60 blur-2xl"
                  aria-hidden
                  style={{ background: 'radial-gradient(closest-side, rgba(16,185,129,0.5), transparent 70%)' }}
                />
              )}
              <div
                className={cn(
                  'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-transform duration-200 group-hover:scale-110',
                  f.accent,
                )}
                aria-hidden="true"
              >
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">{f.subtitle}</p>
              </div>
              <ul className="flex-1 space-y-2.5">
                {f.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[13px]">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span className="text-muted-foreground">{b}</span>
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onGetStarted(f.portal)
                }}
                aria-label={`Enter ${f.title} portal`}
                className="mt-auto w-full rounded-full font-medium"
              >
                Get Started
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </Card>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Value Statements — honest, non-numeric trust builders              */
/* ------------------------------------------------------------------ */
function ValueStatements() {
  const trustStatements = [
    {
      title: 'Never forget a dose',
      body: 'Smart in-app reminders with streaks and family alerts keep everyone on track — including grandparents. Never miss a dose.',
      icon: Bell,
      accent: 'from-emerald-500 to-teal-600',
    },
    {
      title: 'Catch dangerous interactions',
      body: 'AI cross-checks medications for drug-drug, drug-food, and timing conflicts — with severity tags and suggested alternatives (informational only, not medical advice). Works with common US medications.',
      icon: AlertTriangle,
      accent: 'from-amber-500 to-orange-600',
    },
    {
      title: 'Care for everyone you love',
      body: 'Manage up to 4 family members from one dashboard. Get live alerts when a parent misses a dose. Share lab reports with their doctor instantly.',
      icon: Users,
      accent: 'from-teal-500 to-emerald-600',
    },
  ]

  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-gradient-to-b from-emerald-500/5 via-background to-teal-500/5">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="secondary"
            className="mb-3 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          >
            Why Kynthai
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for real families. <span className="text-emerald-600">Backed by AI.</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            We&apos;re building Kynthai in the open. No fake reviews, no inflated numbers —
            just a product that solves real health-management problems for households like yours.
          </p>
          <p className="mt-2 text-[10px] italic text-muted-foreground">
            All statements are anonymized summaries. No personal health information is disclosed.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3 items-stretch">
          {trustStatements.map((r) => (
            <div key={r.title} className="flex h-full">
              <Card className="flex w-full flex-col gap-4 p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
                <div
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg',
                    r.accent
                  )}
                >
                  <r.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{r.title}</h3>
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  {r.body}
                </p>
              </Card>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-xl text-center text-xs text-muted-foreground">
          Join families across America managing medications smarter with AI-powered health tools.
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Why Kynthai — mission & promise, not founder story                   */
/* ------------------------------------------------------------------ */
function FounderStory() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mx-auto max-w-2xl text-center mb-6">
          <Badge
            variant="secondary"
            className="mb-3 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          >
            Why Kynthai
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Health management <span className="text-emerald-600">shouldn&apos;t be this hard</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Millions of Americans manage medications for aging parents, young children, or
            their own health — often juggling scattered notes, multiple pharmacy apps, and
            paper schedules. Kynthai brings everything into one place.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50/60 via-card to-teal-50/60 p-8 sm:p-10">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            {/* Mission icon */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
              <HeartPulse className="h-10 w-10 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-3">Our mission</h3>
              <div className="space-y-3 text-sm leading-relaxed text-foreground/80">
                <p>
                  We built Kynthai because medication management for families is broken. 
                  One missed dose can cascade into an ER visit, a hospital stay, or worse.
                </p>
                <p>
                  Every feature ships because real families need it — not because we answer 
                  to investors or chase growth metrics. We&apos;re building in the open, with 
                  transparency, and we earn your trust every day.
                </p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {[
                  { label: 'Privacy-first from day one', icon: ShieldCheck },
                  { label: 'US-hosted, US-built', icon: Server },
                  { label: 'No surprise billing', icon: DollarSign },
                  { label: 'You own your data', icon: Lock },
                ].map((item) => (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                  >
                    <item.icon className="h-3 w-3" />
                    {item.label}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
                <p className="whitespace-nowrap text-xs font-semibold text-foreground/80">
                  Kynthai Health Technologies LLC
                </p>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Launch CTA — get users into the app now                            */
/* ------------------------------------------------------------------ */
function LaunchCTA({ onGetStarted }: { onGetStarted: (portal?: string) => void }) {
  return (
    <section className="border-y border-border/60 bg-gradient-to-b from-emerald-500/[0.03] to-teal-500/[0.03] py-10 lg:py-14">
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <Badge
          variant="secondary"
          className="mb-4 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
        >
          Available now
        </Badge>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Kynthai is live <span className="text-emerald-600">for US families</span>
        </h2>
        <p className="mt-3 text-muted-foreground">
          Start managing your family&apos;s health today — free to sign up, no credit card required.
        </p>

        <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => onGetStarted('patient')}
            className="h-12 flex-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-6 text-white shadow-lg shadow-emerald-600/20"
          >
            Get Started Free
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => onGetStarted('login')}
            className="h-12 flex-1 rounded-full border-border px-6"
          >
            Sign In
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Privacy-first · encryption · US-hosted
        </p>
      </div>
    </section>
  )
}


/* ------------------------------------------------------------------ */
/* Email Capture — stay updated                                        */
/* ------------------------------------------------------------------ */
function EmailCapture({ onGetStarted }: { onGetStarted: (portal?: string) => void }) {
  const [email, setEmail] = React.useState('')
  const [submitted, setSubmitted] = React.useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    // Newsletter signup — stores via localStorage until backend API is ready
    setSubmitted(true)
  }

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
            <p className="mt-2 font-semibold text-emerald-700 dark:text-emerald-300">You&apos;re subscribed!</p>
            <p className="mt-1 text-sm text-muted-foreground">We&apos;ll send occasional updates about Kynthai.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              aria-label="Email address"
              className="flex h-12 w-full rounded-full border border-border bg-background px-5 text-sm outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
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
          Already using Kynthai? You&apos;re on the waitlist — <button onClick={() => onGetStarted('login')} className="text-emerald-600 underline">sign in</button> to manage your preferences.
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Honest Social Proof — no fake numbers or fabricated testimonials    */
/* ------------------------------------------------------------------ */
function HonestSocialProof() {
  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-gradient-to-b from-muted/20 via-emerald-500/[0.03] to-muted/20">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        aria-hidden
        style={{ background: 'radial-gradient(closest-side, rgba(16,185,129,0.1) 0%, transparent 70%)' }}
      />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: what we're building */}
          <div>
            <div className="mx-auto max-w-2xl text-center lg:text-left lg:mx-0 mb-6">
              <Badge
                variant="secondary"
                className="mb-4 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
              >
                Built for American families
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                A health companion <span className="text-emerald-600">you can trust</span>
              </h2>
              <p className="mt-3 text-muted-foreground">
                We&apos;re not here to sell you on fake numbers. Kynthai is a new kind of health app —
                transparent about where we are, honest about what we&apos;re building, and accountable
                to every user who trusts us with their family&apos;s health.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-5">
              {[
                { value: 'Live now', label: 'Available today for US families', icon: Sparkles },
                { value: 'No VC', label: 'Built for users, not investors', icon: DollarSign },
                { value: 'Multi-generational', label: 'For families of all ages', icon: Users },
              ].map((s) => (
                <div
                  key={s.label}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-2xl border p-5 sm:p-6 text-center transition-all duration-200 border-border/60 bg-card/60 hover:border-emerald-500/20 hover:shadow-lg',
                  )}
                >
                  <s.icon className="mb-2 h-5 w-5 text-muted-foreground" />
                  <div className="text-xl font-bold sm:text-2xl text-emerald-600">
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs font-medium text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: what we believe */}
          <div className="flex flex-col justify-center gap-4">
            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-teal-500/5 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">How we build</h3>
              <ul className="mt-4 space-y-3">
                {[
                  'Transparent pricing in USD — no hidden fees, no surprise charges.',
                  'Your data belongs to you — export or delete anytime, no questions asked.',
                  'Privacy-first architecture with encryption at rest and in transit.',
                  'US-hosted on Supabase Cloud — your data never leaves American soil.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-emerald-500/15 bg-gradient-to-r from-emerald-500/[0.03] via-card to-emerald-500/[0.03] px-6 py-5">
          {[
            { label: 'Building in public', Icon: Sparkles },
            { label: 'AI-powered reminders', Icon: Bell },
            { label: 'Medicine interaction checker', Icon: Pill },
            { label: 'Privacy-first', Icon: ShieldCheck },
          ].map((s) => (
            <div key={s.label} className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-3 py-1.5 text-sm font-medium text-foreground/70">
              <s.Icon className="h-3.5 w-3.5 text-emerald-600" />
              {s.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Pricing teaser                                                      */
/* ------------------------------------------------------------------ */
function PricingTeaser({ onGetStarted }: { onGetStarted: (portal?: string) => void }) {
  const currency = 'USD'
  type Tier = {
    name: string
    price: string
    cadence: string
    features: string[]
    cta: string
    onClick: () => void
    highlight?: boolean
    icon: React.ComponentType<{ className?: string }>
    tierKey: 'plus' | 'family_pro'
    yearlyNote?: string
  }
  const tiers: Tier[] = [
    {
      name: 'Free',
      price: '$0',
      cadence: 'forever',
      features: [
        '1 member profile',
        '3 medications',
        '3 AI chats / day',
        'All smart reminders',
        'Medicine interaction checker',
      ],
      cta: 'Start Free',
      onClick: onGetStarted,
      icon: Gift,
      tierKey: 'plus',
    },
    {
      name: 'Plus',
      price: formatPrice(PRICING[currency].plus.monthly, currency),
      cadence: '/ month',
      yearlyNote: `${PRICING[currency].plus.yearly}/yr (billed annually)`,
      features: [
        '1 member profile',
        'Unlimited medications',
        'Unlimited AI chat',
        'Priority doctor consults',
        'Advanced drug interaction checker',
        'Lab test booking',
      ],
      cta: 'Upgrade',
      onClick: onGetStarted,
      highlight: true,
      icon: Sparkles,
      tierKey: 'plus',
    },
    {
      name: 'Family Pro',
      price: formatPrice(PRICING[currency].family_pro.monthly, currency),
      cadence: '/ month',
      yearlyNote: `${PRICING[currency].family_pro.yearly}/yr (billed annually)`,
      features: [
        'Up to 4 members',
        'Everything in Plus',
        'Smart reminders for all',
        'Weekly AI health insights',
        'Family health reports',
        'Caregiver dashboard',
      ],
      cta: 'Get Family Pro',
      onClick: onGetStarted,
      icon: Users,
      tierKey: 'family_pro',
    },
  ]

  return (
    <section id="pricing-preview" className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-50"
        aria-hidden
        style={{ background: 'radial-gradient(ellipse 80% 50% at center, rgba(16,185,129,0.08) 0%, transparent 70%)' }}
      />

      <div className="mx-auto max-w-2xl text-center">
        <Badge
          variant="secondary"
          className="mb-4 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
        >
          Simple, honest pricing
        </Badge>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Start free. <span className="text-emerald-600">Upgrade only when you need more.</span>
        </h2>
        <p className="mt-3 text-muted-foreground">
          No credit card to start. No lock-in. Cancel anytime. All prices in USD.
        </p>
        <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2">
          {['Cards', 'Apple Pay', 'Google Pay'].map((m) => (
            <span key={m} className="rounded-full border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {m}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-6 grid max-w-5xl gap-5 md:grid-cols-3 items-stretch">
        {tiers.map((t) => (
          <div key={t.name} className={cn('flex h-full', t.highlight ? 'md:-mt-2 md:mb-0' : '')}>
            <Card
              className={cn(
                'relative flex w-full flex-col p-6 sm:p-7 transition-all duration-200',
                'hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-900/5',
                t.highlight
                  ? 'border-emerald-500/40 shadow-lg shadow-emerald-600/10'
                  : 'border-border/60 hover:border-emerald-500/25',
              )}
            >
              {t.highlight && (
                <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-700/30">
                    ⭐ Most Popular
                  </Badge>
                </div>
              )}

              {t.yearlyNote && (
                <div className="absolute -top-3 right-4 z-10">
                  <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300">
                    Save {yearlySavingsPct(currency, t.tierKey)}%
                  </Badge>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md',
                    t.highlight
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                      : 'bg-gradient-to-br from-emerald-500/80 to-teal-600/80',
                  )}
                >
                  <t.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{t.name}</h3>
              </div>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="bg-gradient-to-br from-emerald-600 to-teal-700 bg-clip-text text-4xl font-bold text-transparent">
                  {t.price}
                </span>
                <span className="text-sm text-muted-foreground">{t.cadence}</span>
              </div>

              {t.yearlyNote && (
                <p className="mt-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{t.yearlyNote}</p>
              )}

              <ul className="mt-5 flex-1 space-y-2.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm leading-snug">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={t.onClick}
                className={cn(
                  'mt-6 w-full rounded-full font-medium',
                  t.highlight
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/20'
                    : '',
                )}
                variant={t.highlight ? 'default' : 'outline'}
              >
                {t.cta}
              </Button>
            </Card>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-6 max-w-md text-center text-xs text-muted-foreground">
        Save up to {yearlySavingsPct(currency, 'family_pro')}% with annual billing — always in USD. No surprise charges.
      </p>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Commission — partner showcase (waitlist only, no free signup)      */
/* ------------------------------------------------------------------ */
function Commission({ onPick }: { onPick: (p: LoginPortal) => void }) {
  return (
    <section id="features-anchor" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="secondary" className="mb-3 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">For professionals</Badge>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Earn with Kynthai</h2>
        <p className="mt-3 text-muted-foreground">Transparent platform fees — no hidden cuts. You keep the lion&apos;s share.</p>
      </div>
      
      <div className="mx-auto mt-6 grid max-w-4xl gap-5 sm:grid-cols-2">
        <Card className="relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-teal-500/5">
          <CardContent className="p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <Stethoscope className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">For Doctors</h3>
            </div>
            <div className="mt-5">
              <span className="bg-gradient-to-br from-emerald-600 to-teal-700 bg-clip-text text-5xl font-bold text-transparent">{DOCTOR_BASE_FEE_PCT}%</span>
              <span className="ml-2 text-sm text-muted-foreground">platform fee</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Transparent fees on every consultation and medicine order routed through your practice.</p>
            <p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
              You keep the majority of every earning — no hidden cuts.
            </p>
            <Button className="mt-5 w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white" onClick={() => onPick('doctor')}>Apply as a Doctor</Button>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden border-teal-500/30 bg-gradient-to-br from-teal-500/10 via-card to-emerald-500/5">
          <CardContent className="p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
                <Microscope className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">For Labs</h3>
            </div>
            <div className="mt-5">
              <span className="bg-gradient-to-br from-teal-600 to-emerald-700 bg-clip-text text-5xl font-bold text-transparent">{LAB_BASE_FEE_PCT}%</span>
              <span className="ml-2 text-sm text-muted-foreground">platform fee</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Transparent fees on every test booking fulfilled through Kynthai&apos;s network.</p>
            <p className="mt-4 rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 text-xs text-muted-foreground">
              You keep the majority of every earning — no hidden cuts.
            </p>
            <Button className="mt-5 w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white" onClick={() => onPick('lab')}>Partner as a Lab</Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* US Trust Badges                                                     */
/* ------------------------------------------------------------------ */
function USTrust() {
  const badges = [
    {
      icon: Scale,
      label: 'Privacy-First',
      sub: 'Data protection by design',
      description: 'Your data stays yours',
      highlight: true,
    },
    {
      icon: ShieldPlus,
      label: 'Encrypted Storage',
      sub: 'Industry-standard encryption',
      description: 'Encryption at rest and in transit',
    },
    {
      icon: Server,
      label: 'Secure Infrastructure',
      sub: 'Protected cloud hosting',
      description: 'Data on secure US-based servers',
    },
    {
      icon: Globe,
      label: 'US-Hosted Data',
      sub: 'Supabase Cloud (US region)',
      description: 'All data stored on US soil',
    },
  ]

  return (
    <section
      aria-labelledby="compliance-heading"
      className="border-y border-border/60 bg-gradient-to-b from-muted/30 via-emerald-500/5 to-muted/30 py-8"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-6">
          <Badge
            variant="secondary"
            className="mb-3 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          >
            Trust & Security
          </Badge>
          <h3 id="compliance-heading" className="text-2xl font-bold tracking-tight">
            Your data is safe, <span className="text-emerald-600">by design</span>.
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Encryption at rest and in transit · US-hosted servers · Privacy-first architecture
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {badges.map((b) => (
            <div key={b.label}>
              <div
                className={cn(
                  'flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all',
                  b.highlight
                    ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 shadow-md shadow-emerald-600/5'
                    : 'border-border/60 bg-card hover:shadow-md',
                )}
              >
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl',
                    b.highlight
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg'
                      : 'bg-emerald-500/10 text-emerald-600',
                  )}
                  aria-hidden="true"
                >
                  <b.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{b.label}</p>
                  <p className="text-[11px] text-muted-foreground">{b.sub}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Legal footnote */}
        <p className="mx-auto mt-6 max-w-2xl text-center text-[10px] leading-relaxed text-muted-foreground">
          Kynthai Health Technologies LLC operates secure data handling practices.
          Data hosting on Supabase Cloud, US region.
          For questions: privacy@kynthai.app.
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */
function FAQ() {
  const faqs: Array<{ q: string; a: string }> = [
    {
      q: 'Is my health data safe?',
      a: "Yes. Kynthai is designed with Privacy-first safeguards. Your data is encrypted at rest and in transit. We never sell your personal data. You can export or delete it anytime.",
    },
    {
      q: 'What payment methods are supported?',
      a: "We support secure card payments, ACH, Apple Pay, and Google Pay. No UPI. All pricing is in USD with no hidden currency conversion.",
    },
    {
      q: 'Is it really free to start?',
      a: 'Yes. The Free tier includes 1 member profile, 3 medications, 3 AI chats per day, and all smart reminders. No credit card required. Upgrade only when you need more. The AI only answers health & medication questions — it will not respond to coding, homework, or non-health topics.',
    },
    {
      q: 'Are the doctors verified?',
      a: "Our admin team reviews every doctor's professional credentials before platform access. Checks typically include medical registration numbers, government-issued photo ID, and qualification documents. Approved doctors receive a platform badge confirming our review was completed. Verification status reflects our initial review only; individual doctors remain responsible for maintaining their own professional registration and licence with the relevant state medical council.",
    },
    {
      q: 'Can I cancel anytime?',
      a: 'Yes, cancel anytime with one tap in your profile. No questions asked.',
    },
    {
      q: 'Does it work for elderly family members?',
      a: 'Absolutely. Kynthai was designed for multi-generational American families. Clear in-app reminders, large text, and SOS alerts make it accessible for seniors. Caretakers get live alerts if a dose is missed.',
    },
    {
      q: "What if my doctor isn't on Kynthai?",
      a: "You can still use all patient features — reminders, AI chat, symptom analyzer, medicine ID, drug interactions. Invite your doctor to join for free; they earn on every consult and medicine order routed through Kynthai.",
    },
  ]

  return (
    <section className="border-y border-border/60 bg-muted/30 py-10 lg:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="secondary"
            className="mb-3 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          >
            Frequently asked questions
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to know
          </h2>
          <p className="mt-3 text-muted-foreground">
            Still curious? Email us at{' '}
            <a
              href="mailto:hello@kynthai.app"
              className="font-medium text-emerald-600 hover:underline"
            >
              hello@kynthai.app
            </a>
            .
          </p>
        </div>

        <Card className="mt-6 p-2 sm:p-4">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`item-${i}`}>
                <AccordionTrigger className="px-3 text-left text-base font-medium sm:text-[15px]">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="px-3 text-sm leading-relaxed text-muted-foreground sm:text-[13.5px]">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </div>
    </section>
  )
}

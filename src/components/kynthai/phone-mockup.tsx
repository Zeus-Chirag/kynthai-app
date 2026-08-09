'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Bell,
  Heart,
  MessageCircle,
  Camera,
  Search,
  Home,
  Pill,
  Sparkles,
  CheckCircle2,
  Clock,
  Wifi,
  Battery,
  SignalMedium,
  ShieldCheck,
  Bot,
  Zap,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KynthaiIcon } from './logo';

/* ── Entrance animation — container fades in, children stagger ─────── */
/* Only the container entrance; children use their own staggered delays  */
const containerEntrance = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/* Children stagger in after container is visible — no y overlap        */
const sectionEntrance = (i: number) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delay: 0.35 + 0.06 * i, duration: 0.35, ease: 'easeOut' as const },
  },
});

/** ── CSS keyframes are defined in src/app/globals.css ──────────────── */

/**
 * Fixed-canvas phone sizing (the responsive core).
 *
 * The phone is designed at a constant 340px canvas and is uniformly
 * zoom-scaled by `.phone-canvas` to fit its column (container-query zoom,
 * see .phone-scale-container in globals.css). A fluid width would reflow
 * the fixed-px content differently at every viewport — the "phone looks
 * different on each device" bug. With a fixed canvas:
 *
 *   • every device renders the IDENTICAL composition (padding, text,
 *     card layout, badge offsets) — just uniformly scaled, never reflowed;
 *   • zoom = min(1, columnWidth / 340px), so it never exceeds the column;
 *   • no JS, no CLS: `.phone-canvas` is pure CSS on both the skeleton and
 *     the hydrated mockup (identical box → zero layout shift).
 *
 * All inner spacing below is viewport-independent on purpose: the canvas
 * width never changes, so no `sm:`/`lg:` content variants are needed.
 */
const PHONE_SIZE = 'phone-canvas relative mx-auto';

function RingPulse({ className }: { className: string }) {
  return (
    <span
      className={cn('absolute rounded-full', className)}
      aria-hidden
      style={{
        background: 'radial-gradient(circle, rgba(16,185,129,0.55) 0%, transparent 70%)',
        animation: 'phone-ring-pulse 3.6s ease-out infinite',
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
      }}
    />
  );
}

export function PhoneMockup({
  className,
  ariaHidden,
}: {
  className?: string;
  ariaHidden?: boolean;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div
        className={cn(PHONE_SIZE, className)}
        aria-hidden={ariaHidden}
        style={{ opacity: 1 }}
      >
        {/* Static non-animated version for reduced motion */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[3rem]"
          aria-hidden
        >
          <div
            className="absolute inset-0 rounded-[3rem] opacity-75 blur-3xl"
            style={{
              background: 'radial-gradient(ellipse closest-side, rgba(16,185,129,0.6), rgba(13,148,136,0.28) 45%, transparent 70%)',
            }}
          />
        </div>
        <div className="relative rounded-[3rem] border-[3px] border-emerald-300/60 bg-neutral-950 p-[4px] shadow-2xl shadow-emerald-900/50 phone-frame">
          {/* Screen: NO overflow-hidden — height follows content, so the
              content can never be cut on any device. The rounded frame is
              kept (background clips itself to the radius). */}
          <div className="rounded-[2.85rem] bg-white dark:bg-neutral-900">
            <div className="relative mx-auto mt-2 h-6 w-16 rounded-full bg-neutral-950" />
            <div className="flex items-center justify-between px-5 pt-1.5 pb-0.5 text-[10px] font-semibold text-neutral-900 dark:text-neutral-100">
              <span>9:41</span>
              <div className="flex items-center gap-1">
                <SignalMedium className="h-3 w-3" />
                <Wifi className="h-3 w-3" />
                <Battery className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="flex items-center justify-between px-4 pt-2 pb-1">
              <div className="flex items-center gap-2">
                <KynthaiIcon size={22} />
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Kynthai</span>
              </div>
              <div className="relative">
                <Bell className="h-4 w-4 text-neutral-600" />
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-500" />
              </div>
            </div>
            <div className="mx-4 mt-2 rounded-2xl p-4 text-white"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 55%, #065f46 100%)' }}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" /> Good morning, Emily
                </span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm">Plus</span>
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <div className="flex-1 space-y-1.5">
                  <div className="rounded-xl bg-white/12 px-2.5 py-1.5">
                    <p className="text-[9px] text-emerald-100 uppercase tracking-wider">Today</p>
                    <p className="text-sm font-bold leading-tight">3 of 4 doses taken</p>
                  </div>
                  <div className="rounded-xl bg-white/12 px-2.5 py-1.5">
                    <p className="text-[9px] text-emerald-100 uppercase tracking-wider">Next due</p>
                    <p className="text-sm font-bold leading-tight">Metformin 500mg</p>
                    <p className="text-[10px] text-emerald-100/80">After breakfast · 10:30 AM</p>
                  </div>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerEntrance}
      initial="hidden"
      animate="visible"
      className={cn(PHONE_SIZE, className)}
      aria-hidden={ariaHidden}
    >
      {/* ── Decorative glow layer — bounded to the phone frame ────────
       * An absolute inset-0 overflow-hidden box matching the phone frame:
       * the halo + ring pulses live INSIDE it, so they can never bleed
       * past the phone silhouette — there is nothing for an ancestor (or
       * the viewport edge) to clip differently per device. Same footprint
       * everywhere → identical rendering on every screen. */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[3rem]"
        aria-hidden
      >
        <div
          className="absolute inset-0 rounded-[3rem] opacity-75 blur-3xl"
          style={{
            background:
              'radial-gradient(ellipse closest-side, rgba(16,185,129,0.6), rgba(13,148,136,0.28) 45%, transparent 70%)',
          }}
        />
        <RingPulse className="-inset-4 h-[110%] w-[110%]" />
        <RingPulse className="left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* ── Phone body ──────────────────────────────────────────────── */}
      <div className="relative rounded-[3rem] border-[3px] border-emerald-300/60 bg-neutral-950 p-[4px] shadow-2xl shadow-emerald-900/50 phone-frame">
        <div
          className="pointer-events-none absolute inset-0 rounded-[3rem]"
          aria-hidden
          style={{
            background: 'linear-gradient(130deg, rgba(255,255,255,0.15) 0%, transparent 55%)',
          }}
        />

        {/* Screen: NO overflow-hidden — height follows content, so the
            content can never be cut on any device. The rounded frame is
            kept (background clips itself to the radius). */}
        <div className="rounded-[2.85rem] bg-white dark:bg-neutral-900">
          {/* Dynamic Island */}
          <div className="relative mx-auto mt-2 h-6 w-16 rounded-full bg-neutral-950" />

          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-1.5 pb-0.5 text-[10px] font-semibold text-neutral-900 dark:text-neutral-100">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <SignalMedium className="h-3 w-3" />
              <Wifi className="h-3 w-3" />
              <Battery className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* App header */}
          <div className="flex items-center justify-between px-4 pt-2 pb-1">
            <div className="flex items-center gap-2">
              <KynthaiIcon size={22} />
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Kynthai
              </span>
            </div>
            <div className="relative">
              <Bell className="h-4 w-4 text-neutral-600" />
              <span
                className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,1)]"
                style={reduced ? {} : { animation: 'phone-pulse-bell 2s ease-in-out infinite 1.2s' }}
              />
            </div>
          </div>

          {/* ── Hero greeting card ──────────────────────────────────── */}
          <motion.div
            variants={sectionEntrance(0)}
            initial="hidden"
            animate="visible"
            className="relative mx-4 mt-2 overflow-hidden rounded-2xl p-4 text-white"
            style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 55%, #065f46 100%)' }}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
              <div
                className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-phone-sheen"
                aria-hidden
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="h-3 w-3" /> Good morning, Emily
              </span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm">Plus</span>
            </div>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div className="flex-1 space-y-1.5">
                <div className="rounded-xl bg-white/12 px-2.5 py-1.5">
                  <p className="text-[9px] text-emerald-100 uppercase tracking-wider">Today</p>
                  <p className="text-sm font-bold leading-tight">3 of 4 doses taken</p>
                </div>
                <div className="rounded-xl bg-white/12 px-2.5 py-1.5">
                  <p className="text-[9px] text-emerald-100 uppercase tracking-wider">Next due</p>
                  <p className="text-sm font-bold leading-tight">Metformin 500mg</p>
                  <p className="text-[10px] text-emerald-100/80">After breakfast · 10:30 AM</p>
                </div>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                <Activity className="h-5 w-5" />
              </div>
            </div>
          </motion.div>

          {/* ── Next reminder card ──────────────────────────────────── */}
          <motion.div
            variants={sectionEntrance(1)}
            initial="hidden"
            animate="visible"
            className="mx-4 mt-2.5 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-700">Next reminder</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                <Clock className="h-3 w-3" /> 10:30 AM
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-700 shadow-sm">
                <Pill className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">Metformin 500mg</p>
                <p className="truncate text-[11px] font-medium text-neutral-700">After breakfast · 1 tablet</p>
              </div>
              <button
                className="min-h-11 min-w-11 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-md shadow-emerald-700/30 active:scale-95 transition-transform"
                type="button"
              >
                Take
              </button>
            </div>
          </motion.div>

          {/* ── Today&apos;s checklist ───────────────────────────────── */}
          <motion.div
            variants={sectionEntrance(2)}
            initial="hidden"
            animate="visible"
            className="mx-4 mt-2.5 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-700">Today</span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Zap className="h-3 w-3" /> 3 / 4
              </span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {[
                { name: 'Vitamin D3 1000 IU', time: '8:00 AM', done: true },
                { name: 'Metformin 500mg', time: '10:30 AM', done: false },
                { name: 'Omega-3 Fish Oil', time: '1:00 PM', done: false },
              ].map(r => (
                <li key={r.name} className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                  <CheckCircle2 className={cn('h-4 w-4 shrink-0', r.done ? 'text-emerald-600' : 'text-neutral-300')} />
                  <span className={cn('flex-1 text-[11px] font-bold', r.done ? 'text-neutral-400 line-through' : 'text-neutral-900 dark:text-neutral-100')}>
                    {r.name}
                  </span>
                  <span className="text-[10px] font-semibold text-neutral-700">{r.time}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* ── AI insight card ─────────────────────────────────────── */}
          <motion.div
            variants={sectionEntrance(3)}
            initial="hidden"
            animate="visible"
            className="mx-4 mt-2.5 rounded-2xl border border-amber-200/70 bg-amber-50 p-3 shadow-sm dark:border-amber-700/30 dark:bg-amber-900/10"
          >
            <div className="flex items-start gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400">AI Insight · Kynthai Pro</p>
                <p className="mt-0.5 text-[11px] leading-snug text-amber-800 dark:text-amber-200">
                  Metformin + Omega-3 have no known interactions. Take with food to reduce GI discomfort.
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-amber-500 dark:text-amber-500">Informational only — not medical advice</p>
              </div>
            </div>
          </motion.div>

          {/* ── Bottom navigation ───────────────────────────────────── */}
          <div className="mx-4 mb-2 mt-3 flex items-center justify-around rounded-2xl border border-neutral-200 bg-white/90 px-4 py-2 shadow-sm backdrop-blur dark:border-neutral-700 dark:bg-neutral-800/90">
            <NavIcon icon={<Home className="h-4 w-4" />} active />
            <NavIcon icon={<Pill className="h-4 w-4" />} />
            <div
              className="-mt-5 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-800/40 ring-4 ring-white dark:ring-neutral-900"
              style={reduced ? {} : { animation: 'phone-tick 3.5s ease-in-out infinite' }}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <NavIcon icon={<Camera className="h-4 w-4" />} />
            <NavIcon icon={<MessageCircle className="h-4 w-4" />} />
          </div>
        </div>
      </div>

      {/* ── Floating notification badges ──────────────────────────────── */}
      {/* On mobile: 2 badges with tight offsets; on tablet+ : 4 badges with wider offsets */}
      <FloatingBadge
        className="-left-2 top-24 sm:-left-10 md:flex"
        delay={0.8}
        icon={<Heart className="h-3.5 w-3.5 text-rose-500" />}
        title="Mom's BP taken"
        sub="By you · 2 min ago"
      />
      <FloatingBadge
        className="-right-2 top-44 sm:-right-10 md:flex"
        delay={1.0}
        icon={<Search className="h-3.5 w-3.5 text-emerald-600" />}
        title="Drug interaction"
        sub="Metformin — safe"
      />
      <FloatingBadge
        className="-left-12 bottom-28 hidden lg:flex"
        delay={1.2}
        icon={<Sparkles className="h-3.5 w-3.5 text-amber-500" />}
        title="AI insight ready"
        sub="Weekly report"
      />
      <FloatingBadge
        className="-right-12 bottom-36 hidden lg:flex"
        delay={1.4}
        icon={<ShieldCheck className="h-3.5 w-3.5 text-blue-600" />}
        title="Privacy-safe upload"
        sub="Lab report scanned"
      />
    </motion.div>
  );
}

function NavIcon({ icon, active }: { icon: React.ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-xl transition-colors active:scale-90',
        active ? 'bg-emerald-50 text-emerald-700' : 'text-neutral-400'
      )}
    >
      {icon}
    </button>
  );
}

function FloatingBadge({
  className,
  icon,
  title,
  sub,
  delay = 0,
}: {
  className?: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -5, 0],
      }}
      transition={{
        opacity: { delay, duration: 0.4, ease: 'easeOut' },
        scale: { delay, duration: 0.4, ease: 'easeOut' },
        y: { delay: delay + 0.6, duration: 2.8, repeat: Infinity, ease: 'easeInOut', repeatType: 'mirror' },
      }}
      className={cn(
        'absolute z-20 flex items-center gap-2 rounded-2xl border border-neutral-200/80 bg-white/95 px-3 py-2 shadow-2xl shadow-emerald-900/20 backdrop-blur-xl',
        className,
      )}
      style={{ willChange: 'transform' }}
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-neutral-50">{icon}</div>
      <div>
        <p className="text-[11px] font-bold text-neutral-900">{title}</p>
        <p className="text-[10px] font-semibold text-neutral-700">{sub}</p>
      </div>
    </motion.div>
  );
}

'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
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

/** ── CSS keyframes (injected once) ─────────────────────────────────── */
const STYLES_ID = 'kynthai-phone-styles';

function injectStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLES_ID)) return;
  const css = `
    @keyframes phone-pulse-bell { 0%,100%{transform:scale(1)} 50%{transform:scale(1.35)} }
    @keyframes phone-ring-pulse { 0%,100%{opacity:0;transform:scale(0.85)} 50%{opacity:0.2;transform:scale(1.25)} 100%{opacity:0;transform:scale(1.6)} }
    @keyframes phone-badge-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
    @keyframes phone-tick { 0%,100%{transform:translateY(0)} 25%{transform:translateY(-3px)} 50%{transform:translateY(0)} 75%{transform:translateY(-1px)} }
    @keyframes phone-sheen { from{transform:translateX(-100%) skew(-15deg)} to{transform:translateX(300%) skew(-15deg)} }
    @keyframes phone-spin-slow { from{transform:translateX(-100%) skew(-15deg)} to{transform:translateX(300%) skew(-15deg)} }
  `;
  const style = document.createElement('style');
  style.id = STYLES_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

/** ── Entrance animation — unified, fast ──────────────────────────────── */
const entrance = {
  initial: { opacity: 0, y: 10 },
  animate: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.03 * i, duration: 0.3, ease: 'easeOut' },
  }),
};

function RingPulse({ className }: { className: string }) {
  return (
    <span
      className={cn('absolute rounded-full', className)}
      aria-hidden
      style={{
        background: 'radial-gradient(circle, rgba(16,185,129,0.55) 0%, transparent 70%)',
        animation: 'phone-ring-pulse 4.5s ease-out infinite',
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
  // Inject CSS keyframes once
  React.useEffect(() => { injectStyles(); }, []);

  return (
    <div
      className={cn(
        'relative mx-auto w-full max-w-[270px] sm:max-w-[305px]',
        'animate-in fade-in duration-700',
        className,
      )}
      aria-hidden={ariaHidden}
    >
      {/* ── Layered glow background ─────────────────────────────────── */}
      <div
        className="absolute -inset-10 -z-20 rounded-[5rem] opacity-75 blur-3xl"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse closest-side, rgba(16,185,129,0.6), rgba(13,148,136,0.28) 45%, transparent 70%)',
        }}
      />
      <RingPulse className="-inset-4 h-[110%] w-[110%]" />
      <RingPulse
        className="left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2"
      />

      {/* ── Phone body ──────────────────────────────────────────────── */}
      <div className="relative rounded-[3rem] border-[3px] border-emerald-300/60 bg-neutral-950 p-[3px] shadow-2xl shadow-emerald-900/50 sm:p-[4px]">
        {/* top-edge sheen */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[3rem]"
          aria-hidden
          style={{
            background: 'linear-gradient(130deg, rgba(255,255,255,0.15) 0%, transparent 55%)',
          }}
        />

        <div className="overflow-hidden rounded-[2.85rem] bg-white dark:bg-neutral-900">
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
                style={{ animation: 'phone-pulse-bell 2s ease-in-out infinite 1.2s' }}
              />
            </div>
          </div>

          {/* ── Hero greeting card ──────────────────────────────────── */}
          <div
            className="relative mx-3 mt-2 overflow-hidden rounded-2xl p-3 text-white sm:mx-4 sm:p-4"
            style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 55%, #065f46 100%)' }}
          >
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
              aria-hidden
            >
              <div
                className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                style={{ animation: 'phone-sheen 4s linear infinite' }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="h-3 w-3" />
                Good morning, Aarav
              </span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm">
                Plus
              </span>
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

          {/* ── Next reminder card ──────────────────────────────────── */}
          <div className="mx-3 mt-2.5 rounded-2xl border border-neutral-200 bg-white p-2.5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 sm:mx-4 sm:p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-700">
                Next reminder
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                <Clock className="h-3 w-3" /> 10:30 AM
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-700 shadow-sm">
                <Pill className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Metformin 500mg
                </p>
                <p className="truncate text-[11px] font-medium text-neutral-700">
                  After breakfast · 1 tablet
                </p>
              </div>
              <button
                className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-md shadow-emerald-700/30 active:scale-95 transition-transform"
                type="button"
              >
                Take
              </button>
            </div>
          </div>

          {/* ── Today&apos;s checklist ───────────────────────────────── */}
          <div className="mx-3 mt-2.5 rounded-2xl border border-neutral-200 bg-white p-2.5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 sm:mx-4 sm:p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-700">
                Today
              </span>
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
                <li
                  key={r.name}
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                >
                  <CheckCircle2
                    className={cn(
                      'h-4 w-4 shrink-0',
                      r.done ? 'text-emerald-600' : 'text-neutral-300'
                    )}
                  />
                  <span
                    className={cn(
                      'flex-1 text-[11px] font-bold',
                      r.done
                        ? 'text-neutral-400 line-through'
                        : 'text-neutral-900 dark:text-neutral-100'
                    )}
                  >
                    {r.name}
                  </span>
                  <span className="text-[10px] font-semibold text-neutral-700">{r.time}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── AI insight card ─────────────────────────────────────── */}
          <div className="mx-3 mt-2.5 rounded-2xl border border-amber-200/70 bg-amber-50 p-2.5 shadow-sm dark:border-amber-700/30 dark:bg-amber-900/10 sm:mx-4 sm:p-3">
            <div className="flex items-start gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                  AI Insight · Kynthai Pro
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-amber-800 dark:text-amber-200">
                  Metformin + Omega-3 have no known interactions. Take with food to reduce GI
                  discomfort.
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-amber-500 dark:text-amber-500">
                  Informational only — not medical advice
                </p>
              </div>
            </div>
          </div>

          {/* ── Bottom navigation ───────────────────────────────────── */}
          <div className="mx-3 mb-2 mt-3 flex items-center justify-around rounded-2xl border border-neutral-200 bg-white/90 px-2 py-2 shadow-sm backdrop-blur dark:border-neutral-700 dark:bg-neutral-800/90 sm:mx-4 sm:px-4">
            <NavIcon icon={<Home className="h-4 w-4" />} active />
            <NavIcon icon={<Pill className="h-4 w-4" />} />
            <div
              className="-mt-5 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-800/40 ring-4 ring-white dark:ring-neutral-900"
              style={{ animation: 'phone-tick 3.5s ease-in-out infinite' }}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <NavIcon icon={<Camera className="h-4 w-4" />} />
            <NavIcon icon={<MessageCircle className="h-4 w-4" />} />
          </div>
        </div>
      </div>

      {/* ── Floating notification badges ──────────────────────────────── */}
      <FloatingBadge
        className="-left-14 top-20 hidden md:flex"
        delay={1.1}
        icon={<Heart className="h-3.5 w-3.5 text-rose-500" />}
        title="Mom's BP taken"
        sub="By you · 2 min ago"
      />
      <FloatingBadge
        className="-right-12 top-40 hidden md:flex"
        delay={1.4}
        icon={<Search className="h-3.5 w-3.5 text-emerald-600" />}
        title="Drug interaction"
        sub="Metformin — safe"
      />
      <FloatingBadge
        className="-left-16 bottom-24 hidden lg:flex"
        delay={1.7}
        icon={<Sparkles className="h-3.5 w-3.5 text-amber-500" />}
        title="AI insight ready"
        sub="Weekly report"
      />
      <FloatingBadge
        className="-right-16 bottom-36 hidden lg:flex"
        delay={2}
        icon={<ShieldCheck className="h-3.5 w-3.5 text-blue-600" />}
        title="Privacy-safe upload"
        sub="Lab report scanned"
      />
    </div>
  );
}

function NavIcon({ icon, active }: { icon: React.ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-xl transition-colors active:scale-90',
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
    <div
      className={cn(
        'absolute z-20 flex items-center gap-2 rounded-2xl border border-neutral-200/80 bg-white/95 px-3 py-2 shadow-2xl shadow-emerald-900/20 backdrop-blur-xl',
        'animate-in fade-in slide-in-from-top-2 duration-500',
        className,
      )}
      style={{
        animationDelay: `${delay}s`,
        animationFillMode: 'backwards',
      }}
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-neutral-50">
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-bold text-neutral-900">{title}</p>
        <p className="text-[10px] font-semibold text-neutral-700">{sub}</p>
      </div>
    </div>
  );
}

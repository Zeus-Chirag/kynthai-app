'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

/**
 * PhoneMockup — hydration-safe, lazy client-side wrapper around PhoneMockup.
 *
 * PhoneMockup depends on Framer Motion (~50 KB gzipped).  Dynamically
 * importing it with ssr: false offloads it from the initial page chunk
 * so the server-rendered hero text (the LCP element) can render and
 * paint without waiting for the animation library to download, parse,
 * and execute.
 *
 * WHY NOT `dynamic(..., { ssr: false, loading: <skeleton/> })`:
 * With ssr:false the server emits NO markup for this boundary, but the
 * client's first render emits the loading skeleton — a server/client
 * HTML mismatch that triggers React error #418 (hydration failed), which
 * discards the SSR tree and regenerates the whole animated subtree,
 * killing the mockup entrance, FloatingBadge and RingPulse animations.
 *
 * THE FIX: render the skeleton as plain, synchronous markup (identical
 * on server and client first paint → no mismatch, zero CLS), then mount
 * the real animated mockup only after hydration via useEffect.
 *
 * IMPORTANT: keep `PHONE_SIZE` identical to the `PHONE_SIZE` constant in
 * phone-mockup.tsx — both must resolve to the exact same box, otherwise
 * the skeleton and the hydrated mockup will differ in size and cause CLS.
 *   max-width: clamp(240px, min(80vw, 100%), 340px)
 */
const PHONE_SIZE = 'relative mx-auto w-full max-w-[clamp(240px,min(80vw,100%),340px)]'

/**
 * Lazy mockup — only ever mounted client-side (see PhoneMockup below),
 * so its `loading: () => null` never produces SSR/client DOM mismatch.
 */
const PhoneMockupAnimated = dynamic(
  () => import('./phone-mockup').then((m) => m.PhoneMockup),
  {
    ssr: false,
    // Keep the SSR-identical skeleton mounted while the lazy Framer Motion
    // chunk loads — `loading: () => null` would collapse the phone box to
    // 0 height in the gap between skeleton unmount and chunk ready (CLS).
    // Safe: this dynamic only renders client-side post-hydration (mounted
    // gate), so its loading fallback never participates in SSR first paint.
    loading: () => <PhoneMockupSkeleton />,
  },
)

export function PhoneMockup() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // First paint (server + client hydration): identical skeleton markup.
  if (!mounted) return <PhoneMockupSkeleton />

  // After hydration: swap in the animated mockup. Framer Motion loads lazily.
  return <PhoneMockupAnimated />
}

/* ------------------------------------------------------------------ */
/* Skeleton — plain markup so SSR HTML == client first render          */
/* ------------------------------------------------------------------ */
function PhoneMockupSkeleton() {
  return (
    <div className={cn(PHONE_SIZE)}>
      {/* Phone silhouette — same border-radius + border as real mockup */}
      <div
        className={cn(
          'mx-auto overflow-hidden rounded-[3rem] border-[3px] border-emerald-300/30 bg-neutral-950 p-[3px] sm:p-[4px]',
          'shadow-2xl shadow-emerald-900/30',
        )}
      >
        <div className="overflow-hidden rounded-[2.85rem] bg-neutral-200 dark:bg-neutral-800">
          {/* Dynamic island skeleton */}
          <div className="mx-auto mt-2 h-6 w-16 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          {/* Status bar skeleton */}
          <div className="flex items-center justify-between px-5 pt-1.5 pb-0.5">
            <div className="h-3 w-8 rounded bg-neutral-300 dark:bg-neutral-700" />
            <div className="flex gap-1">
              <div className="h-3 w-3 rounded bg-neutral-300 dark:bg-neutral-700" />
              <div className="h-3 w-3 rounded bg-neutral-300 dark:bg-neutral-700" />
              <div className="h-3 w-4 rounded bg-neutral-300 dark:bg-neutral-700" />
            </div>
          </div>
          {/* Header skeleton */}
          <div className="flex items-center justify-between px-4 pt-2 pb-1">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-lg bg-neutral-300 dark:bg-neutral-700" />
              <div className="h-4 w-16 rounded bg-neutral-300 dark:bg-neutral-700" />
            </div>
            <div className="h-4 w-4 rounded bg-neutral-300 dark:bg-neutral-700" />
          </div>
          {/* Greeting card skeleton */}
          <div className="mx-3 mt-2 rounded-2xl bg-emerald-200/60 p-4 dark:bg-emerald-900/30">
            <div className="h-3 w-24 rounded bg-emerald-300/60 dark:bg-emerald-800/40" />
            <div className="mt-3 space-y-2">
              <div className="h-12 rounded-xl bg-white/30 dark:bg-white/10" />
              <div className="h-14 rounded-xl bg-white/30 dark:bg-white/10" />
            </div>
          </div>
          {/* Bottom skeleton */}
          <div className="mx-3 mt-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-3">
            <div className="h-3 w-20 rounded bg-neutral-300 dark:bg-neutral-700" />
            <div className="mt-3 flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-neutral-300 dark:bg-neutral-700" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-24 rounded bg-neutral-300 dark:bg-neutral-700" />
                <div className="h-2.5 w-20 rounded bg-neutral-300/60 dark:bg-neutral-700/60" />
              </div>
              <div className="h-7 w-14 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </div>
          </div>
          {/* More skeleton */}
          <div className="mx-3 mt-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-3">
            <div className="h-3 w-16 rounded bg-neutral-300 dark:bg-neutral-700" />
            <div className="mt-2 flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-neutral-300 dark:bg-neutral-700" />
              <div className="h-3 flex-1 rounded bg-neutral-300 dark:bg-neutral-700" />
              <div className="h-2.5 w-12 rounded bg-neutral-300/60 dark:bg-neutral-700/60" />
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-neutral-300 dark:bg-neutral-700" />
              <div className="h-3 flex-1 rounded bg-neutral-300 dark:bg-neutral-700" />
              <div className="h-2.5 w-12 rounded bg-neutral-300/60 dark:bg-neutral-700/60" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

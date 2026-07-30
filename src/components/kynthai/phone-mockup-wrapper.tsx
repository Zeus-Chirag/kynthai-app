'use client'

import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

/**
 * PhoneMockupWrapper — lazy client-side wrapper around PhoneMockup.
 *
 * PhoneMockup depends on Framer Motion (~50 KB gzipped).  Dynamically
 * importing it with ssr: false offloads it from the initial page chunk
 * so the server-rendered hero text (the LCP element) can render and
 * paint without waiting for the animation library to download, parse,
 * and execute.
 *
 * The placeholder is sized to match the real mockup's approximate height
 * so no layout shift (CLS) occurs when the animated component hydrates.
 */
const PhoneMockup = dynamic(
  () =>
    import('./phone-mockup').then((m) => m.PhoneMockup),
  {
    ssr: false,
    loading: () => (
      <div
        className={cn(
          'relative mx-auto w-full max-w-[90vw] sm:max-w-[320px]',
        )}
      >
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
    ),
  },
)

export { PhoneMockup }

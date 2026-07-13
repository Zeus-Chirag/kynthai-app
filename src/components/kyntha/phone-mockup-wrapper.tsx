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
 * The placeholder preserves the hero layout (two-column grid) so no
 * layout shift (CLS) is introduced while the component downloads.
 */
const PhoneMockup = dynamic(
  () =>
    import('./phone-mockup').then((m) => m.PhoneMockup),
  {
    ssr: false,
    // Minimal spinner — keeps the hero grid shape stable while the
    // ~50 KB Framer Motion chunk loads (typically < 300 ms on a good
    // connection; < 1 s on 3G).
    loading: () => (
      <div
        className={cn(
          'relative mx-auto w-full max-w-[260px] sm:max-w-[300px]',
          'animate-pulse',
        )}
      >
        {/* Phone silhouette placeholder */}
        <div
          className={cn(
            'mx-auto rounded-[2.8rem] border-[2px] border-border/50 bg-muted/60',
            'aspect-[9/19] shadow-lg',
          )}
        />
      </div>
    ),
  },
)

export { PhoneMockup }

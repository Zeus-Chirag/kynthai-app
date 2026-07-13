'use client'

import { KynthaBrand } from '@/components/kyntha/logo'

export default function PatientLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50/40 via-background to-background dark:from-emerald-950/20">
      <div className="flex flex-col items-center gap-4">
        <KynthaBrand iconSize={40} />
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading your health dashboard…</p>
        {/* Mobile skeleton mirrors the real app layout */}
        <div className="mt-6 w-80 max-w-[90vw] space-y-3">
          <div className="h-28 animate-pulse rounded-3xl bg-emerald-500/10" style={{ animationDelay: '0ms' }} />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl border border-border/40 bg-muted/40"
              style={{ animationDelay: `${(i + 1) * 120}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

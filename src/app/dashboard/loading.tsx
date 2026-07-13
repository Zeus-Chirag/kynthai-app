'use client'

import { KynthaBrand } from '@/components/kyntha/logo'

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <KynthaBrand iconSize={40} />
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        <p className="text-sm text-muted-foreground animate-pulse">Opening dashboard…</p>
        {/* Skeleton cards */}
        <div className="mt-6 w-72 space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 w-full animate-pulse rounded-2xl border border-border/40 bg-muted/40"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

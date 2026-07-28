'use client'

import { KynthaiBrand } from '@/components/kynthai/logo'

export default function DoctorLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <KynthaiBrand iconSize={40} />
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading doctor portal…</p>
        <div className="mt-6 w-80 max-w-[90vw] space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-2xl border border-border/40 bg-muted/40"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

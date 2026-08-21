'use client'

import { AppLoader } from '@/components/kynthai/app-loader'
import { LoadingState } from '@/components/kynthai/loading-state'

export function LoadingSpinner() {
  return <AppLoader label="Loading…" />
}

export function LoadingCard() {
  return <LoadingState label="Loading…" fullPage={false} />
}

export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-muted rounded animate-pulse" style={{ width: `${100 - i * 20}%` }} />
      ))}
    </div>
  )
}

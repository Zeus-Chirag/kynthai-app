'use client'

import * as React from 'react'
import { WifiOff, Loader2, AlertCircle } from 'lucide-react'
import { useOfflineQueue } from '@/hooks/use-offline-queue'
import { cn } from '@/lib/utils'

interface OfflineIndicatorProps {
  className?: string
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const { isOnline, pendingCount, isSyncing } = useOfflineQueue()

  if (isOnline && pendingCount === 0) return null

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
        isOnline
          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
        className
      )}
    >
      {isSyncing ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Syncing…</span>
        </>
      ) : isOnline ? (
        <>
          <AlertCircle className="h-3 w-3" />
          <span>{pendingCount} pending</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Offline</span>
        </>
      )}
    </div>
  )
}

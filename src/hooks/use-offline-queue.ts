'use client'

import * as React from 'react'
import {
  onConnectivityChange,
  queueAction,
  syncQueue,
  clearQueue,
  getQueueActions,
  type QueuedAction,
} from '@/lib/offline-queue'

// ── Types ──────────────────────────────────────────────────────────

export interface UseOfflineQueueResult {
  isOnline: boolean
  pendingCount: number
  isSyncing: boolean
  queue: QueuedAction[]
  enqueue: (action: Parameters<typeof queueAction>[0]) => QueuedAction
  sync: () => Promise<{ synced: number; failed: number }>
  clear: () => void
}

// ── Hook ───────────────────────────────────────────────────────────

export function useOfflineQueue(): UseOfflineQueueResult {
  const [state, setState] = React.useState<{
    isOnline: boolean
    pendingCount: number
    isSyncing: boolean
    queue: QueuedAction[]
  }>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: getQueueActions().length,
    isSyncing: false,
    queue: getQueueActions(),
  }))

  React.useEffect(() => {
    const unsub = onConnectivityChange((s) => {
      setState((prev) => ({
        ...prev,
        isOnline: s.isOnline,
        pendingCount: s.pendingCount,
        isSyncing: s.isSyncing,
        queue: s.pendingCount > 0 ? getQueueActions() : prev.queue,
      }))
    })
    return unsub
  }, [])

  const enqueue = React.useCallback((action: Parameters<typeof queueAction>[0]) => {
    const entry = queueAction(action)
    setState((prev) => ({
      ...prev,
      pendingCount: prev.pendingCount + 1,
      queue: [...prev.queue, entry],
    }))
    return entry
  }, [])

  const sync = React.useCallback(async () => {
    setState((prev) => ({ ...prev, isSyncing: true }))
    try {
      const result = await syncQueue()
      setState((prev) => ({
        ...prev,
        isSyncing: false,
        pendingCount: Math.max(0, prev.pendingCount - result.synced),
        queue: getQueueActions(),
      }))
      return result
    } catch {
      setState((prev) => ({ ...prev, isSyncing: false }))
      return { synced: 0, failed: 0 }
    }
  }, [])

  const clear = React.useCallback(() => {
    clearQueue()
    setState((prev) => ({ ...prev, pendingCount: 0, queue: [] }))
  }, [])

  return {
    isOnline: state.isOnline,
    pendingCount: state.pendingCount,
    isSyncing: state.isSyncing,
    queue: state.queue,
    enqueue,
    sync,
    clear,
  }
}

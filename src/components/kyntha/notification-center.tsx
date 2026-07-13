'use client'

import * as React from 'react'
import { Bell, CheckCheck, X, Pill, Calendar, Trophy, Users, Info, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type NotificationType = 'reminder' | 'alert' | 'achievement' | 'family' | 'system'

interface Notification {
  id: string
  channel: string
  type: NotificationType
  title: string
  body: string
  status: string
  createdAt: string
  read: boolean
}

const TYPE_CONFIG: Record<NotificationType, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  reminder: { icon: Pill, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  alert: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  achievement: { icon: Trophy, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  family: { icon: Users, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
  system: { icon: Info, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10' },
}

const BORDER_COLORS: Record<NotificationType, string> = {
  reminder: 'border-l-blue-500',
  alert: 'border-l-amber-500',
  achievement: 'border-l-emerald-500',
  family: 'border-l-purple-500',
  system: 'border-l-slate-400',
}

interface NotificationCenterProps {
  userId: string
  isDemo: boolean
  onNavigate?: (tab: string) => void
}

export function NotificationCenter({ userId, isDemo, onNavigate }: NotificationCenterProps) {
  const [open, setOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [loading, setLoading] = React.useState(true)
  const [marking, setMarking] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  const loadNotifications = React.useCallback(async () => {
    setLoading(true)
    if (isDemo) {
      const demo: Notification[] = [
        { id: 'demo-notif-1', channel: 'app', type: 'reminder', title: 'Time for Metformin', body: 'Take your 500mg Metformin dose with breakfast.', status: 'sent', createdAt: new Date(Date.now() - 15 * 60000).toISOString(), read: false },
        { id: 'demo-notif-2', channel: 'app', type: 'achievement', title: '7-Day Streak!', body: 'You have taken all medications on time for 7 consecutive days.', status: 'sent', createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), read: false },
        { id: 'demo-notif-3', channel: 'app', type: 'family', title: 'Caretaker updated notes', body: 'Your family member added a note about your blood pressure reading.', status: 'sent', createdAt: new Date(Date.now() - 5 * 3600000).toISOString(), read: true },
        { id: 'demo-notif-4', channel: 'app', type: 'system', title: 'App updated', body: 'Kyntha 2.0 is here with AI insights and family care features.', status: 'sent', createdAt: new Date(Date.now() - 24 * 3600000).toISOString(), read: true },
      ]
      setNotifications(demo)
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications ?? [])
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [isDemo])

  React.useEffect(() => { loadNotifications() }, [loadNotifications])

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    setMarking(true)
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (isDemo) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setMarking(false)
      return
    }
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: unreadIds }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch { /* silent */ } finally {
      setMarking(false)
    }
  }

  const handleClick = (notif: Notification) => {
    if (onNavigate) {
      switch (notif.type) {
        case 'reminder': onNavigate('meds'); break
        case 'achievement': onNavigate('care'); break
        case 'family': onNavigate('care'); break
        case 'alert': onNavigate('home'); break
        default: onNavigate('home')
      }
    }
    setOpen(false)
  }

  const timeAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => { setOpen((prev) => !prev); if (!open) loadNotifications() }}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-muted"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-border/60 bg-background shadow-2xl shadow-black/10 z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllRead} disabled={marking} className="h-7 text-[11px] text-muted-foreground hover:text-foreground">
                  <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
                </Button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <span className="text-sm">Loading…</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs mt-0.5">We will keep you updated here.</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div role="list" aria-label="Notifications" className="p-2 space-y-1">
                  {notifications.slice(0, 20).map((notif) => {
                    const config = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system
                    const Icon = config.icon
                    return (
                      <button
                        key={notif.id}
                        onClick={() => handleClick(notif)}
                        className={cn(
                          'w-full flex gap-3 rounded-xl border-l-[3px] p-3 text-left transition-all',
                          BORDER_COLORS[notif.type],
                          notif.read ? 'bg-transparent opacity-70' : 'bg-muted/40',
                          'hover:bg-muted/60'
                        )}
                      >
                        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', config.bg)}>
                          <Icon className={cn('h-4 w-4', config.color)} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={cn('text-sm leading-tight', !notif.read && 'font-semibold')}>{notif.title}</p>
                            {!notif.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(notif.createdAt)}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

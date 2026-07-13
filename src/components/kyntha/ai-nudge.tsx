'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lightbulb, AlertTriangle, PartyPopper, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────
export type NudgeType = 'tip' | 'warning' | 'celebration' | 'reminder'

export interface Nudge {
  id: string
  type: NudgeType
  title: string
  message: string
  action?: string
  actionLabel?: string
  dismissible?: boolean
}

interface AiNudgeProps {
  nudge: Nudge | null
  onDismiss: (id: string) => void
  onAction?: (action: string) => void
}

// ── Style map ────────────────────────────────────────────────────────
const TYPE_STYLES: Record<NudgeType, { icon: React.ElementType; border: string; bg: string; iconBg: string; iconText: string; badge: string }> = {
  tip: {
    icon: Lightbulb,
    border: 'border-emerald-200 dark:border-emerald-800',
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/40',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-amber-200 dark:border-amber-800',
    bg: 'bg-amber-50/80 dark:bg-amber-950/40',
    iconBg: 'bg-amber-100 dark:bg-amber-900',
    iconText: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  },
  celebration: {
    icon: PartyPopper,
    border: 'border-teal-200 dark:border-teal-800',
    bg: 'bg-teal-50/80 dark:bg-teal-950/40',
    iconBg: 'bg-teal-100 dark:bg-teal-900',
    iconText: 'text-teal-600 dark:text-teal-400',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  },
  reminder: {
    icon: Bell,
    border: 'border-sky-200 dark:border-sky-800',
    bg: 'bg-sky-50/80 dark:bg-sky-950/40',
    iconBg: 'bg-sky-100 dark:bg-sky-900',
    iconText: 'text-sky-600 dark:text-sky-400',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  },
}

// ── Slide-in animation ───────────────────────────────────────────────
const nudgeVariants = {
  hidden: { opacity: 0, y: -20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.97,
    transition: { duration: 0.25, ease: 'easeIn' as const },
  },
}

// ── Component ────────────────────────────────────────────────────────
export function AiNudge({ nudge, onDismiss, onAction }: AiNudgeProps) {
  const [show, setShow] = React.useState(false)
  const [paused, setPaused] = React.useState(false)

  const handleDismiss = React.useCallback(() => {
    setShow(false)
    // Wait for exit animation before calling onDismiss
    setTimeout(() => {
      if (nudge) onDismiss(nudge.id)
    }, 260)
  }, [nudge, onDismiss])

  // Auto-dismiss timer (30 s)
  React.useEffect(() => {
    if (!nudge) return
    setShow(true)
    const timer = setTimeout(() => handleDismiss(), 30_000)
    return () => clearTimeout(timer)
  }, [nudge, handleDismiss])

  if (!nudge) return null

  const styles = TYPE_STYLES[nudge.type]
  const Icon = styles.icon

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          key={nudge.id}
          variants={nudgeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn('relative overflow-hidden rounded-xl border shadow-sm', styles.border, styles.bg)}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          role="alert"
        >
          <div className="flex items-start gap-3 p-4">
            {/* Icon */}
            <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', styles.iconBg)}>
              <Icon className={cn('h-4 w-4', styles.iconText)} />
            </span>

            {/* Body */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{nudge.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{nudge.message}</p>

              {nudge.action && nudge.actionLabel && (
                <Button
                  size="sm"
                  variant="outline"
                  className={cn('mt-2.5 h-7 text-xs border-0', styles.badge)}
                  onClick={() => onAction?.(nudge.action!)}
                >
                  {nudge.actionLabel}
                </Button>
              )}
            </div>

            {/* Dismiss */}
            {nudge.dismissible !== false && (
              <button
                onClick={handleDismiss}
                className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Progress bar */}
          {!paused && (
            <motion.div
              className={cn('absolute bottom-0 left-0 h-0.5', styles.iconText)}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 30, ease: 'linear' }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

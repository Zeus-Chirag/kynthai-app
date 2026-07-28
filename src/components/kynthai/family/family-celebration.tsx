'use client'

import * as React from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Trophy, Flame, Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface FamilyCelebrationProps {
  visible: boolean
  onDone: () => void
  streakCount?: number
}

// ---------------------------------------------------------------------------
// Confetti particle
// ---------------------------------------------------------------------------

const CONFETTI_COLORS = [
  '#10b981', '#14b8a6', '#06b6d4', '#f59e0b', '#f43f5e', '#8b5cf6',
  '#ec4899', '#f97316', '#22c55e', '#eab308',
]

function ConfettiPiece({ delay, color, left, duration }: { delay: number; color: string; left: string; duration: number }) {
  return (
    <motion.div
      className="fixed top-0 z-[100] pointer-events-none"
      style={{ left, width: 8, height: 8, borderRadius: 2, backgroundColor: color }}
      initial={{ y: -20, opacity: 1, rotate: 0, scale: 1 }}
      animate={{
        y: ['0vh', '105vh'],
        opacity: [1, 1, 0],
        rotate: [0, 360, 720],
        scale: [1, 0.8, 0.3],
        x: [0, Math.random() * 60 - 30, Math.random() * 80 - 40],
      }}
      transition={{
        duration,
        delay,
        ease: 'easeOut',
        times: [0, 0.6, 1],
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Sparkle burst
// ---------------------------------------------------------------------------

function SparkleBurst({ reduced }: { reduced: boolean }) {
  const count = reduced ? 4 : 12
  const sparkles = React.useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        angle: (360 / count) * i,
        distance: reduced ? 30 + Math.random() * 20 : 60 + Math.random() * 40,
        size: reduced ? 3 : 4 + Math.random() * 4,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: reduced ? 0 : Math.random() * 0.3,
        duration: reduced ? 0.4 : 0.8,
      })),
    [count, reduced],
  )

  return (
    <div className="relative w-24 h-24 mx-auto">
      {sparkles.map((s) => (
        <motion.div
          key={s.id}
          className="absolute top-1/2 left-1/2 rounded-full"
          style={{
            width: s.size,
            height: s.size,
            backgroundColor: s.color,
            marginLeft: -s.size / 2,
            marginTop: -s.size / 2,
          }}
          initial={reduced ? { opacity: 1, scale: 1 } : { x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={
            reduced
              ? { opacity: 1, scale: 1 }
              : {
                  x: Math.cos((s.angle * Math.PI) / 180) * s.distance,
                  y: Math.sin((s.angle * Math.PI) / 180) * s.distance,
                  opacity: [0, 1, 0],
                  scale: [0, 1.2, 0.5],
                }
          }
          transition={
            reduced
              ? { duration: 0.1 }
              : { duration: s.duration, delay: s.delay, ease: 'easeOut' }
          }
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FamilyCelebration
// ---------------------------------------------------------------------------

export function FamilyCelebration({ visible, onDone, streakCount = 0 }: FamilyCelebrationProps) {
  const reduced = useReducedMotion()
  const confettiCount = reduced ? 10 : 40
  const sparkleCount = reduced ? 4 : 12

  const confetti = React.useMemo(
    () =>
      Array.from({ length: confettiCount }, (_, i) => ({
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        left: `${5 + Math.random() * 90}%`,
        delay: Math.random() * 0.8,
        duration: reduced ? 0.8 : 1.5 + Math.random() * 1.5,
      })),
    [confettiCount, reduced],
  )

  React.useEffect(() => {
    if (visible) {
      const timer = setTimeout(onDone, 5000)
      return () => clearTimeout(timer)
    }
    return
  }, [visible, onDone])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Confetti */}
          {confetti.map((c) => (
            <ConfettiPiece key={c.id} {...c} />
          ))}

          {/* Card */}
          <motion.div
            className="relative z-10 mx-4 max-w-sm w-full"
            initial={{ scale: 0.5, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/80 dark:via-background dark:to-teal-950/60 shadow-2xl shadow-emerald-500/20">
              <CardContent className="p-6 text-center space-y-4">
                <SparkleBurst reduced={!!reduced} />

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', damping: 15, stiffness: 200 }}
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30"
                >
                  <Trophy className="h-8 w-8 text-white" />
                </motion.div>

                <div>
                  <motion.h3
                    className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Family Perfect Day!
                  </motion.h3>
                  <motion.p
                    className="text-sm text-muted-foreground mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Everyone took their medications today. Keep it up!
                  </motion.p>
                </div>

                {streakCount > 0 && (
                  <motion.div
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Flame className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {streakCount} day streak
                    </span>
                  </motion.div>
                )}

                <motion.div
                  className="flex items-center justify-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  {Array.from({ length: Math.min(5, Math.ceil(streakCount / 2)) }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 text-amber-400 fill-amber-400"
                    />
                  ))}
                </motion.div>

                <motion.button
                  onClick={onDone}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  Tap to dismiss
                </motion.button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

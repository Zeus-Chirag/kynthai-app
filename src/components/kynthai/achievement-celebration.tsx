'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AchievementCelebrationProps {
  show: boolean
  type: 'streak' | 'first_med' | 'adherence'
  milestone?: number
  onDismiss: () => void
}

const STREAK_MILESTONES = [7, 14, 30, 60, 90]

const confettiColors = [
  '#10b981', '#14b8a6', '#06b6d4', '#f59e0b', '#fbbf24',
  '#a3e635', '#34d399', '#6ee7b7',
]

function ConfettiPiece({ delay, x, color }: { delay: number; x: number; color: string }) {
  return (
    <motion.div
      initial={{ y: 0, x: 0, opacity: 1, rotate: 0, scale: 1 }}
      animate={{
        y: [0, -80, 120],
        x: [0, x, x * 1.5],
        opacity: [1, 1, 0],
        rotate: [0, Math.random() * 360],
        scale: [1, 1.2, 0.5],
      }}
      transition={{ duration: 1.2, delay, ease: 'easeOut' }}
      className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-sm"
      style={{ backgroundColor: color }}
      onAnimationComplete={() => {}}
    />
  )
}

export function AchievementCelebration({ show, type, milestone, onDismiss }: AchievementCelebrationProps) {
  React.useEffect(() => {
    if (show) {
      const t = setTimeout(onDismiss, 3000)
      return () => clearTimeout(t)
    }
    return undefined
  }, [show, onDismiss])

  const messages = {
    streak: {
      title: milestone ? `${milestone}-Day Streak! 🔥` : 'Streak Unlocked!',
      subtitle: milestone
        ? `Incredible consistency — ${milestone} days and counting!`
        : 'You\'re on fire! Keep it up!',
      emoji: '🔥',
    },
    first_med: {
      title: 'First Medication Logged! 💊',
      subtitle: 'Great start on your health journey.',
      emoji: '💊',
    },
    adherence: {
      title: 'Adherence Goal Reached! 🎯',
      subtitle: milestone
        ? `You've hit ${milestone}% adherence this week!`
        : 'Outstanding commitment to your health.',
      emoji: '🎯',
    },
  }

  const msg = messages[type]

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="pointer-events-none fixed bottom-24 left-1/2 z-50 w-72 -translate-x-1/2"
        >
          <div className="relative overflow-hidden rounded-2xl border border-emerald-300 bg-white/95 px-4 py-3.5 shadow-2xl backdrop-blur dark:bg-emerald-950/95 dark:border-emerald-700">
            {/* Confetti */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {confettiColors.map((color, i) => (
                <ConfettiPiece
                  key={i}
                  delay={i * 0.06}
                  x={(i % 2 === 0 ? 1 : -1) * (20 + (i % 3) * 15)}
                  color={color}
                />
              ))}
            </div>

            <div className="relative flex items-start gap-3">
              <span className="text-2xl">{msg.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  {msg.title}
                </p>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                  {msg.subtitle}
                </p>
              </div>
              <button
                onClick={onDismiss}
                className="text-emerald-400 hover:text-emerald-600 transition-colors"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
'use client'

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

function getColor(score: number): { ring: string; bg: string; text: string } {
  if (score >= 80) return { ring: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' }
  if (score >= 60) return { ring: '#14b8a6', bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' }
  if (score >= 40) return { ring: '#f59e0b', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' }
  return { ring: '#f43f5e', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' }
}

interface HealthPulseRingProps {
  score: number
  size?: number
  showLabel?: boolean
  className?: string
}

export function HealthPulseRing({ score, size = 120, showLabel = true, className }: HealthPulseRingProps) {
  const reduced = useReducedMotion()
  const clamped = Math.max(0, Math.min(100, score))
  const colors = getColor(clamped)
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference
  const center = size / 2

  return (
    <div
      className={cn('relative inline-flex flex-col items-center', className)}
      role="img"
      aria-label={`Health pulse score: ${clamped} out of 100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Animated progress ring */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.ring}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={
            reduced
              ? { duration: 0.01 }
              : { duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }
          }
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
        {/* Glow effect */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.ring}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference, opacity: 0 }}
          animate={{ strokeDashoffset: offset, opacity: 0.15 }}
          transition={
            reduced
              ? { duration: 0.01 }
              : { duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }
          }
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            filter: 'blur(6px)',
          }}
        />
        {/* Score number */}
        <motion.text
          x={center}
          y={center - 2}
          textAnchor="middle"
          dominantBaseline="central"
          className={cn('font-bold', size <= 100 ? 'text-lg' : 'text-2xl')}
          fill={colors.ring}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={
            reduced
              ? { duration: 0.01 }
              : { duration: 0.5, delay: 0.6, ease: 'easeOut' }
          }
        >
          {clamped}
        </motion.text>
        {/* "/100" label */}
        {showLabel && size >= 100 && (
          <motion.text
            x={center}
            y={center + (size <= 100 ? 12 : 16)}
            textAnchor="middle"
            className="text-[10px] fill-muted-foreground font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.9 }}
          >
            / 100
          </motion.text>
        )}
      </svg>
    </div>
  )
}

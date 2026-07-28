'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Flame, TrendingUp, TrendingDown, Minus, BookOpen, MessageSquare, Pill, ChevronUp, ChevronDown, Minus as MinusIcon } from 'lucide-react'
import { HealthPulseRing } from './health-pulse-ring'
import { cn } from '@/lib/utils'

export interface PulseData {
  score: number
  breakdown: {
    adherence: number
    streak: number
    journal: number
    symptoms: number
    ai: number
  }
  trend: 'up' | 'down' | 'stable'
  insight: string
  streakDays: number
}

interface DailyPulseCardProps {
  data?: PulseData | null
  loading?: boolean
  onAction?: () => void
  actionLabel?: string
}

const BREAKDOWN_ITEMS = [
  { key: 'adherence', label: 'Meds', icon: Pill, max: 40, color: 'emerald' },
  { key: 'streak', label: 'Streak', icon: Flame, max: 20, color: 'orange' },
  { key: 'journal', label: 'Journal', icon: BookOpen, max: 20, color: 'indigo' },
  { key: 'symptoms', label: 'Symptoms', icon: MessageSquare, max: 10, color: 'pink' },
  { key: 'ai', label: 'AI Chat', icon: MessageSquare, max: 10, color: 'cyan' },
] as const

const COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  pink: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
}

// ── Mini sparkline ──────────────────────────────────────────────────
function Sparkline({ scores, width = 200, height = 40 }: { scores: number[]; width?: number; height?: number }) {
  // Defensive: reject empty, sparse, or non-numeric data before any math
  const clean = scores.filter((s): s is number => typeof s === 'number' && !Number.isNaN(s))
  if (clean.length < 2) return null
  const min = Math.min(...clean)
  const max = Math.max(...clean)
  const range = max - min || 1
  const points = clean.map((s, i) => `${i * (width / (clean.length - 1))},${height - ((s - min) / range) * (height - 4) - 2}`).join(' ')
  const lastScore = clean[clean.length - 1]!
  const prevScore = clean[clean.length - 2]!
  const trendColor = lastScore >= prevScore ? '#10b981' : '#f43f5e'

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={trendColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        opacity="0.8"
      />
      {/* End dot */}
      <circle cx={width} cy={height - ((lastScore - min) / range) * (height - 4) - 2} r="3" fill={trendColor} />
    </svg>
  )
}

export function DailyPulseCard({ data, loading, onAction, actionLabel }: DailyPulseCardProps) {
  const [history, setHistory] = React.useState<number[]>([])
  const [historyLoading, setHistoryLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/health/score?days=7')
        if (res.ok) {
          const result = await res.json()
          setHistory((result.scores || []).map((s: { score: number }) => s.score))
        }
      } catch { /* ignore */ }
      setHistoryLoading(false)
    }
    fetchHistory()
  }, [])

  if (loading) {
    return (
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-teal-500/5">
        <CardContent className="flex items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const TrendIcon = data.trend === 'up' ? TrendingUp : data.trend === 'down' ? TrendingDown : MinusIcon
  const trendColor = data.trend === 'up' ? 'text-emerald-600' : data.trend === 'down' ? 'text-rose-600' : 'text-muted-foreground'
  const trendBg = data.trend === 'up' ? 'bg-emerald-500/10' : data.trend === 'down' ? 'bg-rose-500/10' : 'bg-muted'

  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-teal-500/5 overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Pulse Ring */}
            <div className="shrink-0">
              <HealthPulseRing score={data.score} size={130} />
            </div>

            {/* Details */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-lg font-semibold">Today&apos;s Health Pulse</h3>
                <Badge variant="secondary" className={cn('gap-1', trendBg, trendColor)}>
                  <TrendIcon className="h-3 w-3" />
                  {data.trend === 'up' ? 'Improving' : data.trend === 'down' ? 'Declining' : 'Stable'}
                </Badge>
              </div>

              <p className="mt-1 text-sm text-muted-foreground">{data.insight}</p>

              {/* Streak */}
              {data.streakDays > 0 && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-600">
                  <Flame className="h-3.5 w-3.5" />
                  {data.streakDays} day streak
                </div>
              )}

              {/* 7-day sparkline */}
              {!historyLoading && history.length >= 2 && (
                <div className="mt-3">
                  <p className="text-[10px] text-muted-foreground mb-1">7-day trend</p>
                  <div className="flex items-center gap-2">
                    <Sparkline scores={history} width={160} height={32} />
                    <span className="text-[10px] text-muted-foreground">
                      {history[history.length - 1]! >= history[0]! ? (
                        <span className="text-emerald-600 flex items-center gap-0.5"><ChevronUp className="h-3 w-3" />+{history[history.length - 1]! - history[0]!}</span>
                      ) : history[history.length - 1]! < history[0]! ? (
                        <span className="text-rose-600 flex items-center gap-0.5"><ChevronDown className="h-3 w-3" />{history[history.length - 1]! - history[0]!}</span>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-0.5"><MinusIcon className="h-3 w-3" />0</span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Breakdown bars */}
              <div className="mt-4 grid grid-cols-5 gap-2">
                {BREAKDOWN_ITEMS.map(({ key, label, icon: Icon, max, color }) => {
                  const value = data.breakdown[key as keyof typeof data.breakdown] as number
                  const pct = Math.round((value / max) * 100)
                  return (
                    <div key={key} className="text-center">
                      <div className={cn('mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-lg', COLOR_MAP[color])}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="text-[10px] text-muted-foreground">{label}</div>
                      <div className="text-xs font-semibold">{pct}%</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Action */}
          {onAction && actionLabel && (
            <div className="mt-4 flex justify-center sm:justify-start">
              <Button size="sm" onClick={onAction} className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                {actionLabel}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

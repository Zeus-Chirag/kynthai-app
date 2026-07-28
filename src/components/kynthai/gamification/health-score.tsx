'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, Heart, Brain, Activity, Users } from 'lucide-react'
import { logger } from '@/lib/logger'

interface HealthScoreData {
  score: number
  breakdown: {
    medications: number
    symptoms: number
    journal: number
    family: number
  }
  trend: 'improving' | 'stable' | 'declining'
  previousScore?: number
}

export function HealthScoreWidget() {
  const [data, setData] = useState<HealthScoreData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchScore = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/health-score?date=${today}`)
      if (res.ok) {
        const scoreData = await res.json()
        setData(scoreData)
      }
    } catch (error) {
      logger.warn('Failed to fetch health score:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScore()
  }, [fetchScore])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse flex items-center gap-4">
            <div className="h-16 w-16 bg-muted rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const score = data?.score ?? 0
  const trend = data?.trend ?? 'stable'
  const breakdown = data?.breakdown ?? { medications: 0, symptoms: 0, journal: 0, family: 0 }

  const scoreColor = score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500'
  const scoreBg = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'

  const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus
  const trendColor = trend === 'improving' ? 'text-green-500' : trend === 'declining' ? 'text-red-500' : 'text-gray-500'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Health Score</span>
          <Badge variant={score >= 80 ? 'default' : score >= 60 ? 'secondary' : 'destructive'}>
            {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Attention'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <svg className="h-20 w-20 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted"
              />
              <circle
                cx="50" cy="50" r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${score * 2.83} 283`}
                className={scoreColor}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${scoreColor}`}>{score}</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <TrendIcon className={`h-5 w-5 ${trendColor}`} />
              <span className="text-sm font-medium capitalize">{trend}</span>
            </div>
            {data?.previousScore && (
              <p className="text-sm text-muted-foreground mt-1">
                {score > data.previousScore ? '+' : ''}{score - data.previousScore} from yesterday
              </p>
            )}
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Score Breakdown</h4>
          <BreakdownItem
            icon={Heart}
            label="Medication Adherence"
            score={breakdown.medications}
            maxScore={40}
            color="text-red-500"
          />
          <BreakdownItem
            icon={Activity}
            label="Symptom Tracking"
            score={breakdown.symptoms}
            maxScore={20}
            color="text-blue-500"
          />
          <BreakdownItem
            icon={Brain}
            label="Health Journal"
            score={breakdown.journal}
            maxScore={20}
            color="text-purple-500"
          />
          <BreakdownItem
            icon={Users}
            label="Family Engagement"
            score={breakdown.family}
            maxScore={20}
            color="text-green-500"
          />
        </div>
      </CardContent>
    </Card>
  )
}

function BreakdownItem({
  icon: Icon,
  label,
  score,
  maxScore,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  score: number
  maxScore: number
  color: string
}) {
  const percentage = Math.round((score / maxScore) * 100)

  return (
    <div className="flex items-center gap-3">
      <Icon className={`h-4 w-4 ${color}`} />
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span>{label}</span>
          <span className="text-muted-foreground">{score}/{maxScore}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${color.replace('text-', 'bg-')}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}

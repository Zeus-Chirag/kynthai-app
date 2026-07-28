'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Flame, Trophy, Star, Shield, Heart, Brain, Award, Zap } from 'lucide-react'
import { logger } from '@/lib/logger'

interface Streak {
  type: string
  count: number
  bestCount: number
}

interface BadgeItem {
  badgeType: string
  earnedAt: string
}

const STREAK_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  daily_meds: { label: 'Daily Meds', icon: Flame, color: 'text-orange-500' },
  weekly_perfect: { label: 'Perfect Week', icon: Trophy, color: 'text-yellow-500' },
  family_perfect: { label: 'Family Perfect', icon: Heart, color: 'text-red-500' },
  journal: { label: 'Journaling', icon: Brain, color: 'text-purple-500' },
  symptom: { label: 'Symptom Tracking', icon: Shield, color: 'text-blue-500' },
}

const BADGE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; description: string }> = {
  first_prescription: { label: 'First Rx', icon: Star, color: 'text-yellow-500', description: 'Added your first prescription' },
  streak_7: { label: '7-Day Streak', icon: Flame, color: 'text-orange-500', description: '7 days of perfect adherence' },
  streak_30: { label: 'Monthly Master', icon: Trophy, color: 'text-yellow-500', description: '30-day streak achieved' },
  family_guardian: { label: 'Family Guardian', icon: Heart, color: 'text-red-500', description: 'Checked on a family member' },
  health_scholar: { label: 'Health Scholar', icon: Brain, color: 'text-purple-500', description: 'Read 10 health insights' },
  interaction_detective: { label: 'Interaction Detective', icon: Shield, color: 'text-blue-500', description: 'Caught a drug interaction' },
  health_journal: { label: 'Journal Keeper', icon: Award, color: 'text-green-500', description: 'Logged health for 7 days' },
  early_bird: { label: 'Early Bird', icon: Zap, color: 'text-yellow-500', description: 'Took morning meds before 8am' },
}

export function StreaksAndBadges() {
  const [streaks, setStreaks] = useState<Streak[]>([])
  const [badges, setBadges] = useState<BadgeItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [streaksRes, badgesRes] = await Promise.all([
        fetch('/api/streaks'),
        fetch('/api/badges'),
      ])

      if (streaksRes.ok) {
        const streaksData = await streaksRes.json()
        setStreaks(streaksData.streaks || [])
      }

      if (badgesRes.ok) {
        const badgesData = await badgesRes.json()
        setBadges(badgesData.badges || [])
      }
    } catch (error) {
      logger.warn('Failed to fetch streaks/badges:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="flex gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 w-16 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Streaks & Achievements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Active Streaks */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Active Streaks</h4>
          <div className="grid grid-cols-2 gap-3">
            {streaks.length > 0 ? (
              streaks.map((streak) => {
                const config = STREAK_CONFIG[streak.type]
                if (!config) return null
                const Icon = config.icon
                return (
                  <div
                    key={streak.type}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <Icon className={`h-6 w-6 ${config.color}`} />
                    <div>
                      <p className="text-2xl font-bold">{streak.count}</p>
                      <p className="text-xs text-muted-foreground">{config.label}</p>
                    </div>
                    {streak.bestCount > streak.count && (
                      <p className="text-xs text-muted-foreground ml-auto">
                        Best: {streak.bestCount}
                      </p>
                    )}
                  </div>
                )
              })
            ) : (
              <p className="col-span-2 text-sm text-muted-foreground text-center py-4">
                Start taking your meds to build streaks!
              </p>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Earned Badges</h4>
          <div className="flex flex-wrap gap-2">
            {badges.length > 0 ? (
              badges.map((badge) => {
                const config = BADGE_CONFIG[badge.badgeType]
                if (!config) return null
                const Icon = config.icon
                return (
                  <div
                    key={badge.badgeType}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                    title={config.description}
                  >
                    <Icon className={`h-5 w-5 ${config.color}`} />
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete health actions to earn badges!
              </p>
            )}
          </div>
        </div>

        {/* Upcoming Milestones */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Next Milestone</h4>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="font-medium">7-Day Streak</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Take all your meds for 7 consecutive days to unlock this badge!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

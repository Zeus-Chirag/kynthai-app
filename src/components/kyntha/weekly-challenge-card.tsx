'use client'

import * as React from 'react'
import { Trophy, Flame, Users, Gift, Target, CheckCircle2, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type ChallengeType = 'adherence' | 'journal' | 'ai_chat' | 'family'

interface Challenge {
  id: string
  title: string
  description: string
  type: ChallengeType
  targetCount: number
  currentCount: number
  participants: number
  reward: string
  rewardIcon: React.ComponentType<{ className?: string }>
  endsAt: string
  joined: boolean
}

interface WeeklyChallengeCardProps {
  userId: string
  isDemo: boolean
}

const CHALLENGE_TEMPLATES: Omit<Challenge, 'id' | 'currentCount' | 'participants' | 'joined' | 'endsAt'>[] = [
  { title: '5 Journal Entries', description: 'Complete 5 health journal entries this week to build self-awareness.', type: 'journal', targetCount: 5, reward: 'Insight Badge', rewardIcon: Trophy },
  { title: 'Perfect Adherence', description: 'Take all medications on time for 7 consecutive days.', type: 'adherence', targetCount: 7, reward: 'Gold Star', rewardIcon: Flame },
  { title: 'AI Health Chat', description: 'Have 10 meaningful conversations with your AI health assistant.', type: 'ai_chat', targetCount: 10, reward: 'Curious Mind Badge', rewardIcon: Trophy },
  { title: 'Family Check-in', description: 'Check in with 3 family members this week through the care hub.', type: 'family', targetCount: 3, reward: 'Caretaker Badge', rewardIcon: Users },
]

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function pickChallenge(): Omit<Challenge, 'id' | 'currentCount' | 'participants' | 'joined' | 'endsAt'> {
  const monday = getMonday(new Date())
  const weekIndex = Math.floor((Date.now() - monday.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return CHALLENGE_TEMPLATES[weekIndex % CHALLENGE_TEMPLATES.length]!
}

export function WeeklyChallengeCard({ userId, isDemo }: WeeklyChallengeCardProps) {
  const [challenge, setChallenge] = React.useState<Challenge | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [joining, setJoining] = React.useState(false)

  const loadChallenge = React.useCallback(async () => {
    setLoading(true)
    if (isDemo) {
      const template = pickChallenge()
      const demo: Challenge = {
        ...template,
        id: 'demo-challenge',
        currentCount: 3,
        participants: 142,
        joined: true,
        endsAt: new Date(getMonday(new Date()).getTime() + 6.5 * 24 * 60 * 60 * 1000).toISOString(),
      }
      setChallenge(demo)
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/challenges', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setChallenge(data.challenge ?? null)
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [isDemo])

  React.useEffect(() => { loadChallenge() }, [loadChallenge])

  const joinChallenge = async () => {
    if (!challenge || challenge.joined) return
    setJoining(true)
    if (isDemo) {
      setChallenge((prev) => prev ? { ...prev, joined: true } : null)
      setJoining(false)
      return
    }
    try {
      await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', challengeId: challenge.id }),
      })
      setChallenge((prev) => prev ? { ...prev, joined: true } : null)
    } catch { /* silent */ } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading challenge…</span>
        </CardContent>
      </Card>
    )
  }

  if (!challenge) return null

  const progress = Math.min(100, Math.round((challenge.currentCount / challenge.targetCount) * 100))
  const completed = progress >= 100
  const RewardIcon = typeof challenge.rewardIcon === 'function' ? challenge.rewardIcon : Trophy

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className={cn('overflow-hidden', completed && 'border-emerald-500/30')}>
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', completed ? 'bg-emerald-500/10' : 'bg-amber-500/10')}>
                {completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Target className="h-5 w-5 text-amber-600" />
                )}
              </span>
              <div>
                <h3 className="text-sm font-semibold">Weekly Challenge</h3>
                <p className="text-xs text-muted-foreground">Resets every Monday</p>
              </div>
            </div>
            <Badge variant={completed ? 'default' : 'secondary'} className={cn('text-[10px]', completed && 'bg-emerald-500')}>
              {completed ? 'Completed' : 'In Progress'}
            </Badge>
          </div>

          {/* Title & description */}
          <div>
            <h4 className="text-base font-bold">{challenge.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{challenge.description}</p>
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {challenge.currentCount} / {challenge.targetCount} completed
              </span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Meta row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {(challenge.participants ?? 0).toLocaleString()} joined
              </span>
              <span className="flex items-center gap-1">
                <Gift className="h-3.5 w-3.5" />
                <RewardIcon className="h-3.5 w-3.5" />
                {challenge.reward}
              </span>
            </div>
          </div>

          {/* Action */}
          {!challenge.joined && !completed && (
            <Button
              onClick={joinChallenge}
              disabled={joining}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
              size="sm"
            >
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
              {joining ? 'Joining…' : 'Join Challenge'}
            </Button>
          )}
          {challenge.joined && !completed && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <Flame className="h-3.5 w-3.5" />
              You&apos;re in — keep going!
            </div>
          )}
          {completed && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <Trophy className="h-3.5 w-3.5" />
              Challenge complete — reward earned!
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

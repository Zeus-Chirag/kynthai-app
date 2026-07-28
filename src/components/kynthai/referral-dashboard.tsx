'use client'

import * as React from 'react'
import { Share2, Copy, Gift, Users, Check, TrendingUp, Crown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { ShareSheet } from './share-sheet'

interface ReferralData {
  code: string | null
  link: string | null
  referralCount: number
  rewards: {
    unlocked: Array<{ threshold: number; reward: string; description: string }>
    nextReward: { threshold: number; reward: string; description: string } | null
    totalReferrals: number
  }
}

const REWARD_TIERS = [
  { threshold: 1, reward: '$10 credit', description: 'Get $10 off your next payment', icon: '🎉' },
  { threshold: 3, reward: '1 month free', description: 'Get 1 month free subscription', icon: '⭐' },
  { threshold: 5, reward: 'Free annual plan', description: 'Get annual plan for free', icon: '🏆' },
  { threshold: 10, reward: 'Lifetime Plus', description: 'Free Plus plan for life', icon: '👑' },
]

export function ReferralDashboard() {
  const { toast } = useToast()
  const [data, setData] = React.useState<ReferralData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [shareOpen, setShareOpen] = React.useState(false)

  const fetchReferralData = async () => {
    try {
      const res = await fetch('/api/referral')
      if (res.ok) {
        const referralData = await res.json()
        setData(referralData)
      }
    } catch (error) {
      logger.warn('Failed to fetch referral data:', error)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchReferralData()
  }, [fetchReferralData])

  const generateCode = async () => {
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      })
      if (res.ok) {
        const newData = await res.json()
        setData(newData)
        toast({ title: 'Referral link generated!' })
      }
    } catch {
      toast({ title: 'Failed to generate link', variant: 'destructive' })
    }
  }

  const copyLink = () => {
    if (data?.link) {
      navigator.clipboard.writeText(data.link)
      toast({ title: 'Link copied!' })
    }
  }

  const shareText = data?.code
    ? `Join me on Kynthai — an AI-assisted health app for families. Use my code ${data.code} for exclusive early pricing.`
    : 'Join Kynthai — an AI-assisted health app for families.'

  const progressPct = data
    ? Math.min(100, Math.round((data.referralCount / REWARD_TIERS[REWARD_TIERS.length - 1]!.threshold) * 100))
    : 0

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      {/* Header gradient bar */}
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
            <Gift className="h-4 w-4" />
          </div>
          <div>
            <span className="text-base">Refer & Earn</span>
            <p className="text-xs text-muted-foreground font-normal">Share Kynthai, unlock rewards</p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 p-4">
            <Users className="h-5 w-5 text-emerald-600 mb-1" />
            <p className="text-3xl font-bold bg-gradient-to-br from-emerald-600 to-teal-700 bg-clip-text text-transparent">
              {data?.referralCount || 0}
            </p>
            <p className="text-[11px] text-muted-foreground font-medium">Total Referrals</p>
          </div>
          <div className="flex flex-col items-center rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-4">
            <Crown className="h-5 w-5 text-amber-600 mb-1" />
            <p className="text-3xl font-bold bg-gradient-to-br from-amber-600 to-orange-700 bg-clip-text text-transparent">
              {data?.rewards?.unlocked?.length || 0}
            </p>
            <p className="text-[11px] text-muted-foreground font-medium">Rewards Unlocked</p>
          </div>
        </div>

        {/* Overall progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Overall progress</span>
            <span className="font-semibold text-emerald-600">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        {/* Referral Code */}
        {data?.code ? (
          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your Referral Code
            </p>
            <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 p-3">
              <span className="flex-1 text-center text-lg font-bold tracking-widest text-emerald-700 dark:text-emerald-300">
                {data.code}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyLink}
                className="h-8 w-8 shrink-0 rounded-lg"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-[11px] text-center text-muted-foreground">
              Share this code with friends & family
            </p>
          </div>
        ) : (
          <Button
            onClick={generateCode}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md hover:from-emerald-600 hover:to-teal-700"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Generate Referral Code
          </Button>
        )}

        <Separator />

        {/* Reward tiers with progress */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reward Tiers
            </p>
          </div>
          <div className="space-y-2.5">
            {REWARD_TIERS.map((tier) => {
              const unlocked = (data?.referralCount || 0) >= tier.threshold
              const isNext = data?.rewards?.nextReward?.threshold === tier.threshold
              const progressToTier = data
                ? Math.min(100, Math.round(((data.referralCount) / tier.threshold) * 100))
                : 0

              return (
                <div
                  key={tier.threshold}
                  className={cn(
                    'relative rounded-xl border p-3 transition-all',
                    unlocked
                      ? 'border-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-950/20'
                      : isNext
                        ? 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10'
                        : 'border-border/60 bg-card'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg',
                        unlocked
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-muted'
                      )}
                    >
                      {unlocked ? <Check className="h-5 w-5" /> : <span>{tier.icon}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('text-sm font-semibold truncate', unlocked && 'text-emerald-700 dark:text-emerald-300')}>
                          {tier.reward}
                        </p>
                        <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                          {tier.threshold} {tier.threshold === 1 ? 'referral' : 'referrals'}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{tier.description}</p>
                      {!unlocked && data && (
                        <div className="mt-1.5">
                          <Progress value={progressToTier} className="h-1" />
                        </div>
                      )}
                    </div>
                    {unlocked && (
                      <Badge className="shrink-0 bg-emerald-500 text-[10px]">Unlocked</Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Next reward banner */}
        {data?.rewards?.nextReward && (
          <div className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-amber-500/5 p-3.5">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              Next reward: {data.rewards.nextReward.reward}
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
              {data.rewards.nextReward.threshold - (data.referralCount || 0)} more referral{data.rewards.nextReward.threshold - (data.referralCount || 0) !== 1 ? 's' : ''} needed
            </p>
          </div>
        )}

        {/* Share button */}
        {data?.link && (
          <Button
            onClick={() => setShareOpen(true)}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-600 hover:to-teal-700 h-11"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share your referral code
          </Button>
        )}

        {/* Share sheet */}
        <ShareSheet
          open={shareOpen}
          onOpenChange={setShareOpen}
          shareText={shareText}
          shareUrl={data?.link || undefined}
          title="Share your referral code"
        />
      </CardContent>
    </Card>
  )
}


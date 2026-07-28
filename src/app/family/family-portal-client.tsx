'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Users, HeartPulse, Sparkles, Activity, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FamilyCircle } from '@/components/kynthai/family/family-circle'
import { FamilyHealthPulse, type FamilyMemberPulse } from '@/components/kynthai/family/health-pulse'
import { FamilyHealthFeed } from '@/components/kynthai/family/health-feed'
import { FamilyAnalytics } from '@/components/kynthai/caretaker/family-analytics'
import { AiChat } from '@/components/medication/ai-chat'
import { ErrorBoundary } from '@/components/kynthai/error-boundary'
import { User } from 'lucide-react'
import type { PulseMember } from '@/components/kynthai/family/family-circle'

type Tab = 'circle' | 'pulse' | 'feed' | 'analytics' | 'ai'

const TABS = [
  { id: 'circle' as Tab, label: 'Health Circle', icon: Users },
  { id: 'pulse' as Tab, label: 'Health Pulse', icon: HeartPulse },
  { id: 'feed' as Tab, label: 'Activity Feed', icon: Activity },
  { id: 'analytics' as Tab, label: 'Analytics', icon: TrendingUp },
  { id: 'ai' as Tab, label: 'Ask AI', icon: Sparkles },
]

function normalizePulse(members: FamilyMemberPulse[]): PulseMember[] {
  return members.map((m) => {
    const adherence = m.adherenceScore ?? 0
    let status: PulseMember['status']
    if (m.todayStatus === 'taken') status = 'all_taken'
    else if (m.todayStatus === 'missed') status = 'missed'
    else if (m.todayStatus === 'pending') status = 'in_progress'
    else status = 'no_reminders'
    const total = m.medications?.length ?? 0
    const taken = status === 'all_taken' ? total : 0
    const missed = status === 'missed' ? total : 0
    const score = Math.max(0, Math.min(100, adherence))
    return {
      memberId: m.id,
      name: m.name,
      relation: m.relation,
      color: m.color,
      score,
      adherence,
      total,
      taken,
      missed,
      status,
      lastTaken: null,
      conditions: [],
    }
  })
}

export default function FamilyPortalClient({ user }: { user: { id: string; name?: string; email: string; role: string } }) {
  const router = useRouter()
  const [tab, setTab] = React.useState<Tab>('circle')
  const [pulseData, setPulseData] = React.useState<PulseMember[]>([])

  const handlePulseLoaded = React.useCallback((members: FamilyMemberPulse[]) => {
    setPulseData(normalizePulse(members))
  }, [])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
          <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold">Family Portal</h1>
              <p className="text-xs text-muted-foreground">Welcome, {user.name ?? 'User'}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{(user.name && user.name.charAt(0)) || '?'}</span>
            </Button>
        </div>
        </header>
        <nav className="border-b bg-background/60">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex gap-1 overflow-x-auto py-1">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <Button
                  key={t.id}
                  variant={tab === t.id ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setTab(t.id)}
                  className="gap-1.5 shrink-0"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </Button>
              )
            })}
          </div>
        </div>
        </nav>
        <main className="mx-auto max-w-6xl px-4 py-6">
        {(() => {
          if (tab === "circle") return <div key="c"><FamilyCircle members={pulseData as any} /></div>
          if (tab === "pulse") return <div key="p"><FamilyHealthPulse onDataLoaded={handlePulseLoaded} /></div>
          if (tab === "feed") return <div key="f"><FamilyHealthFeed /></div>
          if (tab === "analytics") return <div key="a"><FamilyAnalytics /></div>
          if (tab === "ai") return <div key="ai"><Card><CardContent className="p-6"><AiChat /></CardContent></Card></div>
          return null
        })()}
        </main>
    </div>
  </ErrorBoundary>
  )
}

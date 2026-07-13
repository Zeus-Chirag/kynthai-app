'use client'

import { useCallback, useState } from 'react'
import {
  Sparkles,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Award,
  Heart,
  RefreshCw,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { MedicalDisclaimer } from '@/components/kyntha/medical-disclaimer'

interface Insights {
  headline: string
  adherenceLabel: string
  strengths: string[]
  concerns: string[]
  recommendations: string[]
  bestStreak: string | null
  worstDay: string | null
  motivationalNote: string
}

interface DayData {
  date: string
  total: number
  taken: number
  skipped: number
  pending: number
}

interface InsightsResponse {
  insights: Insights
  stats: { totalDoses: number; totalTaken: number; totalSkipped: number; adherencePct: number; activeMedCount: number }
  daily: DayData[]
}

const riskColor = (label: string) => {
  const l = label.toLowerCase()
  if (l.includes('excellent')) return 'default'
  if (l.includes('good')) return 'secondary'
  if (l.includes('fair')) return 'outline'
  return 'destructive'
}

function shortDate(ds: string) {
  const d = new Date(ds + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short' })
}

export function HealthInsights({ familyMemberId }: { familyMemberId?: string } = {}) {
  const [data, setData] = useState<InsightsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 7, familyMemberId }),
      })
      if (!res.ok) throw new Error('Failed')
      const d: InsightsResponse = await res.json()
      setData(d)
      toast({ title: 'Insights generated' })
    } catch (e) {
      toast({
        title: 'Failed to generate insights',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-primary">AI Health Insights</p>
            <p className="text-muted-foreground text-xs mt-1">
              Our AI analyzes your 7-day medication adherence, identifies
              patterns, and generates personalized recommendations to help you
              stay on track.
            </p>
          </div>
          <Button onClick={generate} disabled={loading} size="sm" className="bg-primary shrink-0">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span className="ml-1 hidden sm:inline">
              {data ? 'Regenerate' : 'Analyze'}
            </span>
          </Button>
        </CardContent>
      </Card>

      {loading && !data ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : data ? (
        <>
          {/* Headline + stats */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {data.insights.headline}
                </h3>
                <Badge variant={riskColor(data.insights.adherenceLabel)}>
                  {data.insights.adherenceLabel}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat label="Adherence" value={`${data.stats.adherencePct}%`} tone="emerald" />
                <MiniStat label="Doses taken" value={data.stats.totalTaken} tone="cyan" />
                <MiniStat label="Missed" value={data.stats.totalSkipped} tone="amber" />
                <MiniStat label="Active meds" value={data.stats.activeMedCount} tone="violet" />
              </div>
            </CardContent>
          </Card>

          {/* Weekly chart */}
          {data.daily.some((d) => d.total > 0) && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3">Weekly adherence</p>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={shortDate}
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        labelFormatter={(l) => shortDate(String(l))}
                      />
                      <Bar dataKey="taken" name="Taken" stackId="a" fill="var(--primary)" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="skipped" name="Skipped" stackId="a" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Taken
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-destructive" /> Skipped
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Strengths & Concerns */}
          <div className="grid sm:grid-cols-2 gap-3">
            {data.insights.strengths.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                    <Award className="h-4 w-4" /> Strengths
                  </h4>
                  <ul className="space-y-1.5 text-sm">
                    {data.insights.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">✓</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {data.insights.concerns.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                    <AlertTriangle className="h-4 w-4" /> Concerns
                  </h4>
                  <ul className="space-y-1.5 text-sm">
                    {data.insights.concerns.map((c, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">!</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recommendations */}
          {data.insights.recommendations.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-primary mb-2">
                  <Lightbulb className="h-4 w-4" /> AI Recommendations
                </h4>
                <ul className="space-y-2 text-sm">
                  {data.insights.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {i + 1}
                      </span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Motivational note */}
          <Card className="border-primary/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Heart className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm italic">{data.insights.motivationalNote}</p>
            </CardContent>
          </Card>

          <Button variant="outline" onClick={generate} disabled={loading} className="w-full">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="ml-2">Regenerate insights</span>
          </Button>
          <MedicalDisclaimer compact />
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Generate your AI health report</p>
            <p className="text-sm mt-1 max-w-md mx-auto">
              Tap “Analyze” to let AI review your week, spot trends, and suggest
              ways to improve your medication routine.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone: string
}) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    cyan: 'text-cyan-600 dark:text-cyan-400',
    amber: 'text-amber-600 dark:text-amber-400',
    violet: 'text-violet-600 dark:text-violet-400',
  }
  return (
    <div className="rounded-lg border p-2.5 text-center">
      <p className={`text-xl font-bold ${colors[tone]}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

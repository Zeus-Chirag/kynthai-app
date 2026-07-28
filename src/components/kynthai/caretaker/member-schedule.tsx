'use client'

import * as React from 'react'
import { CheckCircle2, Clock, Pill, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/lib/store'
import { playProfessionalRingtone, playAlertRingtone, playSuccessChime, stopAllRingtones, isAlarmRinging } from '@/lib/alarm'

export interface MemberMed {
  id: string
  name: string
  dosage: string
  time: string
  status: 'pending' | 'taken' | 'skipped'
  color?: string
  instructions?: string | null
  medicationId?: string
}

interface Props {
  memberName: string
  memberId: string
  meds: MemberMed[]
  onUpdate?: (med: MemberMed, status: 'taken' | 'skipped') => void
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number) as [number, number]
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
}

export function FamilyMemberSchedule({ memberName, meds, onUpdate }: Props) {
  const { toast } = useToast()
  const { alarmEnabled, alarmMode } = useAppStore()
  const [updating, setUpdating] = React.useState<string | null>(null)

  // Persistent repeating alarm
  const [alarmTarget, setAlarmTarget] = React.useState<MemberMed | null>(null)
  const alarmTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // useRef holds the latest schedule function so the setTimeout callback
  // always calls the current version (avoids stale-closure recursion bug).
  const scheduleRef = React.useRef<(() => void) | null>(null)

  const scheduleNextAlarm = React.useCallback(() => {
    const pending = meds.filter(m => m.status === 'pending')
    if (pending.length === 0) { setAlarmTarget(null); return }

    const sorted = [...pending].sort((a, b) => a.time.localeCompare(b.time))
    const closest = sorted[0]
    setAlarmTarget(closest!)

    if (!isAlarmRinging()) {
      if (alarmMode === 'alert') playAlertRingtone()
      else playProfessionalRingtone()
    }

    if (alarmTimer.current) clearTimeout(alarmTimer.current)
    alarmTimer.current = setTimeout(() => scheduleRef.current?.(), 10 * 60 * 1000) // 10 min default
  }, [meds, alarmMode])

  // Keep the ref in sync so the setTimeout callback always calls the latest version.
  React.useEffect(() => {
    scheduleRef.current = scheduleNextAlarm
  }, [scheduleNextAlarm])

  React.useEffect(() => {
    if (!alarmEnabled) return
    const hasPending = meds.some(m => m.status === 'pending')
    if (hasPending) {
      const timer = setTimeout(() => scheduleNextAlarm(), 800)
      return () => clearTimeout(timer)
    } else {
      setAlarmTarget(null)
      stopAllRingtones()
      return
    }
  }, [alarmEnabled, meds, scheduleNextAlarm])

  const handleAlarmAction = (med: MemberMed, status: 'taken' | 'skipped') => {
    stopAllRingtones()
    if (alarmTimer.current) clearTimeout(alarmTimer.current)
    setAlarmTarget(null)
    updateMed(med, status)
  }

  const updateMed = async (med: MemberMed, status: 'taken' | 'skipped') => {
    setUpdating(med.id)
    if (onUpdate) onUpdate(med, status)
    if (status === 'taken' && alarmEnabled) playSuccessChime()
    toast({ title: status === 'taken' ? 'Marked as taken' : 'Skipped', description: status === 'taken' ? `${med.name} — ${med.dosage}` : undefined })
    setUpdating(null)
  }

  if (meds.length === 0) return null

  const pending = meds.filter(m => m.status === 'pending')
  const done = meds.filter(m => m.status !== 'pending')

  return (
    <div className="space-y-2">
      {/* Persistent alarm for this member */}
      {alarmTarget && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
              {memberName} — Time to take
            </div>
            <button onClick={() => { stopAllRingtones(); setAlarmTarget(null); if (alarmTimer.current) clearTimeout(alarmTimer.current) }} className="text-muted-foreground text-xs" aria-label="Dismiss">✕</button>
          </div>
          <div className="flex items-center gap-2.5">
            <Pill className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold">{alarmTarget.name}</p>
              <p className="text-xs text-muted-foreground">{alarmTarget.dosage} · {formatTime(alarmTarget.time)}</p>
            </div>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleAlarmAction(alarmTarget, 'skipped')} disabled={updating === alarmTarget.id}>
              {updating === alarmTarget.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <Button size="sm" className="h-8 bg-emerald-600 text-white text-xs" onClick={() => handleAlarmAction(alarmTarget, 'taken')} disabled={updating === alarmTarget.id}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Take
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{memberName}</h3>
        <Badge variant="secondary" className="text-[10px]">
          {pending.length} pending
        </Badge>
      </div>

      <div className="space-y-1.5">
        {pending.map(m => (
          <Card key={m.id} className="border-amber-500/20">
            <CardContent className="flex items-center gap-2.5 p-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <Pill className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">{m.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  <Clock className="inline h-2.5 w-2.5" /> {formatTime(m.time)} · {m.dosage}
                  {m.instructions && <span> · {m.instructions}</span>}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleAlarmAction(m, 'skipped')} disabled={updating === m.id}>
                  {updating === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                </Button>
                <Button size="sm" className="h-7 px-2 text-[10px] bg-emerald-600 text-white" onClick={() => handleAlarmAction(m, 'taken')} disabled={updating === m.id}>
                  <CheckCircle2 className="h-3 w-3" /> Take
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {done.length > 0 && (
        <div className="space-y-1">
          {done.map(m => (
            <div key={m.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 opacity-60">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="text-[11px] font-medium line-through text-muted-foreground">{m.name}</span>
              <span className="text-[10px] text-muted-foreground">{formatTime(m.time)}</span>
              <Badge variant="secondary" className="text-[9px]">{m.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

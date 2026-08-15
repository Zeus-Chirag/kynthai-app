'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pill, Calendar, AlertTriangle, CheckCircle2, Clock, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {Alert, AlertDescription} from '@/components/ui/alert'
import { MedicationsList } from '@/components/medication/medications-list'
import { useToast } from '@/hooks/use-toast'

const COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-500', blue: 'bg-blue-500', amber: 'bg-amber-500',
  rose: 'bg-rose-500', violet: 'bg-violet-500', teal: 'bg-teal-500',
  orange: 'bg-orange-500', pink: 'bg-pink-500',
}

interface MemberData {
  id: string
  name: string
  relation: string
  age: number | null
  role: string
  color: string
  conditions: unknown[]
  photoUrl: string | null
  medications: Array<{
    id: string
    name: string
    dosage: string
    frequency: string
    active: boolean
    instructions: string | null
  }>
  reminders: Array<{ id: string; medicationId: string; date: string; time: string; status: string }>
}

export default function FamilyMemberDetailClient({ memberId, user }: { memberId: string; user: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [data, setData] = React.useState<MemberData | null>(null)
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/family/members/${memberId}`)
      if (!res.ok) { setData(null); setLoading(false); return }
      const json = await res.json()
      setData(json)
    } catch {
      toast({ title: 'Failed to load member', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [memberId, toast])

  React.useEffect(() => { void load() }, [load])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Member not found or access denied.</p>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Family
        </Button>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  // reminder.date is a full ISO datetime from the API; normalize to a
  // date-only key on both sides or nothing ever matches (adherence → 0).
  const todayReminders = data.reminders.filter((r) => String(r.date).slice(0, 10) === today)
  const takenToday = todayReminders.filter((r) => r.status === 'taken').length
  const totalToday = todayReminders.length
  const adherence = totalToday > 0 ? Math.round((takenToday / totalToday) * 100) : 0
  const avatarColor = COLOR_MAP[data.color] || 'bg-emerald-500'

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Family
      </Button>

      {/* Member Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`h-16 w-16 rounded-full ${avatarColor} flex items-center justify-center text-white text-2xl font-bold shrink-0`}>
              {data.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{data.name}</h1>
                <Badge variant="outline">{data.relation}</Badge>
                <Badge>{data.role}</Badge>
              </div>
              {data.age && <p className="text-sm text-muted-foreground mt-1">Age: {data.age}</p>}
              {Array.isArray(data.conditions) && data.conditions.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {((data.conditions as string[]) || []).map((c: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">{String(c)}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Today's adherence */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Today's Medication Adherence</span>
              <span className="font-medium">{adherence}%</span>
            </div>
            <Progress value={adherence} className="h-2" />
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-500" /> {takenToday} taken</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-amber-500" /> {totalToday - takenToday} remaining</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="medications">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="medications"><Pill className="h-4 w-4 mr-1" /> Medications</TabsTrigger>
          <TabsTrigger value="reminders"><Calendar className="h-4 w-4 mr-1" /> Reminders</TabsTrigger>
          <TabsTrigger value="details"><User className="h-4 w-4 mr-1" /> Details</TabsTrigger>
        </TabsList>
        <TabsContent value="medications" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Active Medications</CardTitle></CardHeader>
            <CardContent>
              {data.medications.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No medications added yet.</p>
              ) : (
                <div className="space-y-4">
                  {data.medications.map((med) => (
                    <div key={med.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{med.name}</h3>
                        <Badge variant={med.active ? 'default' : 'secondary'}>
                          {med.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {med.dosage && <p className="text-sm text-muted-foreground">Dosage: {med.dosage}</p>}
                      {med.frequency && <p className="text-sm text-muted-foreground">Frequency: {med.frequency}</p>}
                      {med.instructions && <p className="text-sm text-muted-foreground">Instructions: {med.instructions}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reminders" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Today's Reminders</CardTitle></CardHeader>
            <CardContent>
              {todayReminders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No reminders scheduled for today.</p>
              ) : (
                <div className="space-y-2">
                  {todayReminders.map((r) => {
                    const statusFallback = { icon: Clock, color: 'text-muted-foreground', label: 'Pending' } as const
                    const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
                      taken:   { icon: CheckCircle2, color: 'text-green-500', label: 'Taken' },
                      missed:  { icon: AlertTriangle, color: 'text-red-500', label: 'Missed' },
                      skipped: { icon: Clock, color: 'text-amber-500', label: 'Skipped' },
                      pending: { icon: Clock, color: 'text-muted-foreground', label: 'Pending' },
                    }
                    const cfg = statusConfig[r.status] ?? statusFallback
                    const StatusIcon = cfg.icon
                    return (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
                          <div>
                            <p className="font-medium">{r.time}</p>
                            <p className="text-xs text-muted-foreground">Medication ID: {r.medicationId.slice(0, 8)}...</p>
                          </div>
                        </div>
                        <Badge variant={r.status === 'taken' ? 'default' : 'secondary'}>{cfg.label}</Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Member Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Relation:</span> <span className="font-medium ml-2">{data.relation}</span></div>
                <div><span className="text-muted-foreground">Age:</span> <span className="font-medium ml-2">{data.age ?? 'N/A'}</span></div>
                <div><span className="text-muted-foreground">Role:</span> <span className="font-medium ml-2">{data.role}</span></div>
                <div><span className="text-muted-foreground">Color:</span> <span className="font-medium ml-2">{data.color}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Conditions:</span> {Array.isArray(data.conditions) && data.conditions.length > 0 ? data.conditions.join(', ') : 'None'}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

'use client'

import React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, MailCheck, CheckCircle2, FileText, CalendarClock } from 'lucide-react'
import { useAppStore, selectors } from '@/lib/store'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type InviteInfo = {
  id: string
  doctorName: string
  specialization: string
  patientName: string
  patientEmailMasked: string
  inviteStatus: string
  followUpDate: string | null
  createdAt: string
}

export function InviteClient() {
  const params = useSearchParams()
  const router = useRouter()
  const user = useAppStore(selectors.user)
  const token = params?.get('token')?.trim() ?? ''

  const [info, setInfo] = React.useState<InviteInfo | null>(null)
  const [loading, setLoading] = React.useState<boolean>(!!token)
  const [accepting, setAccepting] = React.useState(false)
  const [accepted, setAccepted] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('This invite link is missing its token. Please use the full link from the email.')
      return
    }
    let cancelled = false
    fetch(`/api/invite?token=${encodeURIComponent(token)}`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(data?.error || 'This invite link is invalid or has expired.')
          return
        }
        setInfo(data.prescription)
      })
      .catch(() => {
        if (!cancelled) setError('Could not reach the server. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const handleAccept = async () => {
    if (!token) return
    setAccepting(true)
    setError(null)
    try {
      const csrfRes = await fetch('/api/auth/csrf', { credentials: 'include' })
      const { token: csrf } = await csrfRes.json()
      const res = await fetch('/api/invite', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        setError(data?.error || 'Could not accept the invite. Please try again.')
        return
      }
      setAccepted(true)
      setInfo((prev) => (prev ? { ...prev, inviteStatus: 'accepted' } : prev))
    } catch {
      setError('Could not accept the invite. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  const followUp = info?.followUpDate
    ? new Date(info.followUpDate).toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/20">
      <Card className="w-full max-w-md border-border/60 shadow-lg">
        <CardHeader className="space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow">
            {accepted ? <CheckCircle2 className="h-7 w-7" /> : <FileText className="h-7 w-7" />}
          </div>
          <CardTitle className="text-center text-xl">
            {accepted ? 'Prescription accepted' : 'Prescription invite'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Validating invite…
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </div>
          )}

          {info && !loading && !accepted && (
            <>
              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
                <div className="flex items-start gap-3">
                  <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-semibold">{info.doctorName || 'Your doctor'}</p>
                    <p className="text-xs text-muted-foreground">
                      {info.specialization || 'Healthcare professional'}
                    </p>
                  </div>
                </div>
                {info.patientEmailMasked && (
                  <p className="text-xs text-muted-foreground">
                    Sent to: <span className="font-medium text-foreground">{info.patientEmailMasked}</span>
                  </p>
                )}
                {followUp && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarClock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Follow-up: {followUp}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Accepting will link this prescription to your account so you can review your
                  medications and track adherence. This invite expires 30 days after it was sent.
                </p>
              </div>

              {info.inviteStatus === 'accepted' ? (
                <p className="text-center text-sm text-emerald-600 dark:text-emerald-400">
                  This prescription has already been accepted.
                </p>
              ) : user ? (
                <Button
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow hover:from-emerald-600 hover:to-teal-700"
                  disabled={accepting}
                  onClick={handleAccept}
                >
                  {accepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Accept prescription
                </Button>
              ) : (
                <>
                  <Button
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow hover:from-emerald-600 hover:to-teal-700"
                    onClick={() => router.push('/login')}
                  >
                    Sign in to accept
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Sign in with the account that received this prescription.
                  </p>
                </>
              )}
            </>
          )}

          {accepted && (
            <>
              <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <p>Your prescription from {info?.doctorName || 'your doctor'} is now linked to your account.</p>
                {followUp && <p>Follow-up: {followUp}</p>}
              </div>
              <Button
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow hover:from-emerald-600 hover:to-teal-700"
                onClick={() => router.push('/patient')}
              >
                Open my dashboard
              </Button>
            </>
          )}

          {!loading && !error && !info && !accepted && (
            <p className="text-center text-sm text-muted-foreground">
              No invite found for this link.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

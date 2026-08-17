'use client'

import * as React from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { enablePush, disablePush, permissionState, pushSupported } from '@/lib/push'

/**
 * PushNotificationToggle — lets the user enable/disable push notifications.
 * Shown in the Profile / Settings area of the portals.
 */
export function PushNotificationToggle() {
  const { toast } = useToast()
  const [busy, setBusy] = React.useState(false)
  const [enabled, setEnabled] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    if (!pushSupported()) {
      setEnabled(false)
      return
    }
    setEnabled(permissionState() === 'granted')
  }, [])

  async function onEnable() {
    setBusy(true)
    try {
      const ok = await enablePush()
      setEnabled(ok)
      if (ok) {
        toast({ title: 'Notifications enabled', description: 'You will get reminders even when the app is closed.' })
      } else {
        toast({ title: 'Notifications blocked', description: 'Allow notifications in your browser settings, then try again.', variant: 'destructive' })
      }
    } finally {
      setBusy(false)
    }
  }

  async function onDisable() {
    setBusy(true)
    try {
      await disablePush()
      setEnabled(false)
      toast({ title: 'Notifications disabled' })
    } finally {
      setBusy(false)
    }
  }

  if (enabled === null) {
    return (
      <div className="flex items-center gap-3 p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Checking notifications…</span>
      </div>
    )
  }

  if (enabled) {
    return (
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <Bell className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium">Notifications enabled</p>
            <p className="text-xs text-muted-foreground">You get reminders even when the app is closed.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onDisable} disabled={busy}>
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <BellOff className="h-3 w-3" />}
          Disable
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Bell className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium">Enable push notifications</p>
          <p className="text-xs text-muted-foreground">Get reminded about meds, consultations & lab results.</p>
        </div>
      </div>
      <Button size="sm" onClick={onEnable} disabled={busy || !pushSupported()}>
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
        Enable
      </Button>
    </div>
  )
}

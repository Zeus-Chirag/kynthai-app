'use client'

/**
 * InstallPrompt
 *
 * Listens for the browser's `beforeinstallprompt` event and renders a premium
 * "Install Kynthai" card. Honours a 7-day dismiss persistence window via
 * localStorage so the card doesn't reappear immediately after dismissal.
 *
 * Renders `null` if the prompt isn't available, the user already dismissed it
 * within 7 days, or the app is already installed (display-mode: standalone).
 */

import * as React from 'react'
import { Download, X, Sparkles, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'kynthai:install-dismissed'
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isRecentlyDismissed(): boolean {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY) || 0)
    if (!ts) return false
    return Date.now() - ts < DISMISS_TTL_MS
  } catch {
    return false
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch { /* ignore */ }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    if (isStandalone() || isRecentlyDismissed()) return

    const onBefore = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    const onInstalled = () => {
      setVisible(false)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onBefore)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const handleInstall = React.useCallback(async () => {
    if (!deferred) return
    try {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === 'accepted') {
        setVisible(false)
        setDeferred(null)
      } else {
        markDismissed()
        setVisible(false)
      }
    } catch {
      setVisible(false)
    }
  }, [deferred])

  const handleDismiss = React.useCallback(() => {
    markDismissed()
    setVisible(false)
  }, [])

  if (!visible || !deferred) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:bottom-6">
      <Card className="pointer-events-auto w-full max-w-md overflow-hidden border-emerald-500/30 shadow-xl shadow-emerald-900/10">
        <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white">
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="absolute right-2 top-2 rounded-md p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold leading-tight">Install Kynthai</p>
              <p className="mt-1 text-xs opacity-90 leading-snug">
                Add Kynthai to your home screen for faster access, offline support,
                and native notifications.
              </p>
            </div>
          </div>
        </div>
        <CardContent className="flex items-center justify-between gap-3 p-3">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Free · No app store needed
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 text-xs">
              Not now
            </Button>
            <Button
              size="sm"
              onClick={handleInstall}
              className="h-8 gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            >
              <Download className="h-3.5 w-3.5" />
              Install
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

/**
 * NotificationPermission
 *
 * - Renders nothing visible.
 * - Waits 5s after mount, then asks for `Notification.requestPermission()`.
 * - If granted, immediately fires a "welcome" notification.
 * - Honours a 3-day dismiss persistence so we don't pester the user.
 * - Exports a `sendNotification(title, options)` helper that other components
 *   can use to fire local notifications when permission has been granted.
 */

import * as React from 'react'

const DISMISS_KEY = 'kyntha:notif-perm-dismissed'
const DISMISS_TTL_MS = 3 * 24 * 60 * 60 * 1000 // 3 days
const WELCOME_DELAY_MS = 5_000

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

export interface SendNotificationOptions {
  body?: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
}

/**
 * Fire a local notification. Returns true if it was actually shown.
 * No-ops gracefully if permission isn't granted or Notifications API isn't
 * available.
 */
export function sendNotification(title: string, options: SendNotificationOptions = {}): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false
  try {
    const n = new Notification(title, {
      body: options.body,
      icon: options.icon || '/icon.svg',
      badge: options.badge || '/icon.svg',
      tag: options.tag,
      data: options.data as unknown as Record<string, unknown>,
    })
    // Auto-close after 6s so users don't end up with stale notifications.
    setTimeout(() => n.close(), 6_000)
    return true
  } catch {
    return false
  }
}

export function NotificationPermission() {
  React.useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    // Already granted or already denied — nothing to do.
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return
    if (isRecentlyDismissed()) return

    const timer = setTimeout(async () => {
      try {
        const perm = await Notification.requestPermission()
        if (perm === 'granted') {
          sendNotification('Welcome to Kyntha 💚', {
            body: 'You will now receive medication reminders, follow-up alerts, and SOS notifications here.',
            tag: 'kyntha-welcome',
          })
        } else if (perm === 'denied') {
          markDismissed()
        }
      } catch {
        // Some browsers throw if requestPermission is called without a
        // user gesture — silently ignore.
      }
    }, WELCOME_DELAY_MS)

    return () => clearTimeout(timer)
  }, [])

  return null
}

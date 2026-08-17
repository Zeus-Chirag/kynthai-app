'use client'

/**
 * Push notification client — register the service worker, request permission,
 * and store the subscription for server-side push (via /api/notifications/push).
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export function pushSupported(): boolean {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
}

export function permissionState(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied'
  return Notification.permission
}

/**
 * Register the service worker + request permission + subscribe.
 * Returns true if push is fully enabled for this device.
 */
export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) return false
  if (!VAPID_PUBLIC_KEY) {
    // VAPID not configured — fail silently (server-side push won't work).
    return false
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    let perm = Notification.permission
    if (perm === 'default') {
      perm = await Notification.requestPermission()
    }
    if (perm !== 'granted') return false

    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await storeSubscription(sub)
      return true
    }

    const newSub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    await storeSubscription(newSub)
    return true
  } catch {
    return false
  }
}

/** Remove the push subscription from the server (logout / opt-out). */
export async function disablePush(): Promise<void> {
  try {
    await fetch('/api/notifications/subscribe', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
  } catch { /* best-effort */ }
}

async function storeSubscription(sub: PushSubscription): Promise<void> {
  const csrfRes = await fetch('/api/auth/csrf', { credentials: 'include' })
  const { token: csrf } = await csrfRes.json().catch(() => ({ token: null }))
  await fetch('/api/notifications/subscribe', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
    },
    body: JSON.stringify(sub),
  })
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

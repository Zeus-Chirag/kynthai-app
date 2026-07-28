/* Kynthai Service Worker
 *
 * - Network-first for HTML navigations (fast latest UI, offline fallback).
 * - Cache-first for static assets (JS/CSS/images/fonts) so reloads are instant.
 * - Pre-caches core static assets on install.
 */

const VERSION = 'kynthai-v2'
const STATIC_CACHE = `${VERSION}-static`
const RUNTIME_CACHE = `${VERSION}-runtime`

const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon.svg',
  '/logo.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
]

// ---------------------------------------------------------------------------
// Install: pre-cache core static assets
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      try {
        await cache.addAll(PRECACHE_URLS)
      } catch (e) {
        // Some URLs may 404 in dev — don't fail the whole install.
        console.warn('[sw] precache partial failure', e)
      }
      await self.skipWaiting()
    })(),
  )
})

// ---------------------------------------------------------------------------
// Activate: clean up old caches
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k)),
      )
      await self.clients.claim()
    })(),
  )
})

// ---------------------------------------------------------------------------
// Fetch strategy
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  // Don't intercept non-http(s) requests (chrome-extension, etc).
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return

  // Don't intercept any Next.js internal URL — dev chunks, HMR, API,
  // or SSR-injected script/style transports. Always go to the network.
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/')
  ) return

  // 1. Navigation requests → network-first with offline fallback.
  // Cache by actual URL instead of hardcoded '/' to avoid serving a stale
  // cached shell for every navigation.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req)
          if (fresh && fresh.ok) {
            const cache = await caches.open(RUNTIME_CACHE)
            cache.put(req, fresh.clone()).catch(() => {})
          }
          return fresh
        } catch (e) {
          const cache = await caches.open(RUNTIME_CACHE)
          const offline = await cache.match('/offline.html')
          if (offline) return offline
          const cached = await cache.match(req)
          if (cached) return cached
          return new Response('You are offline. Please reconnect to use Kynthai.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          })
        }
      })(),
    )
    return
  }

  // 2. Static assets (_next/static, images, fonts, icons) → cache-first.
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|webp|svg|ico|manifest|json)$/i.test(url.pathname)

  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req)
          if (fresh && fresh.ok) {
            const cache = await caches.open(RUNTIME_CACHE)
            cache.put(req, fresh.clone()).catch(() => {})
            return fresh
          }
          const cached = await caches.match(req)
          if (cached) return cached
          return new Response('', { status: 504 })
        } catch (e) {
          const cached = await caches.match(req)
          if (cached) return cached
          return new Response('', { status: 504 })
        }
      })(),
    )
    return
  }

  // 3. Anything else → stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE)
      const cached = await cache.match(req)
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            cache.put(req, res.clone()).catch(() => {})
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    })(),
  )
})

// ---------------------------------------------------------------------------
// Message handler: allow pages to trigger skipWaiting.
// ---------------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})

// ---------------------------------------------------------------------------
// Push event handler — receives push notifications (FCM/APNs/etc. via the
// browser push service). Parses a JSON payload if possible, else falls back
// to plain-text body. Then displays a system notification.
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    // Payload wasn't JSON — treat it as plain text.
    data = { title: 'Kynthai', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Kynthai'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    tag: data.tag || 'kynthai-default',
    renotify: !!data.renotify,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// ---------------------------------------------------------------------------
// Notification click handler — focus the app window if it's already open,
// otherwise open a new one. Falls back to '/' if no URL on the notification.
// ---------------------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window pointing at the target URL if one exists.
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus()
          }
        }
        // Otherwise try to focus any already-open Kynthai window.
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus()
          }
        }
        // Last resort: open a new window.
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
        return undefined
      }),
  )
})

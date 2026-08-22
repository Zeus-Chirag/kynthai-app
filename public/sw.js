/* Kynthai Service Worker
 *
 * - Deploy build cache-busting via deploy ID to prevent stale shells.
 * - Network-first for HTML navigations (always fresh UI, offline fallback).
 * - Cache-first for static assets (JS/CSS/images/fonts) so reloads are instant.
 * - Pre-caches core static assets on install.
 */

// Build-time injected deploy ID — change this on every deploy to invalidate
// all old caches immediately. Next.js already cache-busts _next/static via
// content hashes, but the HTML shell & SW itself need manual versioning.
const DEPLOY_ID = self.location ? new URL(self.location.href).searchParams.get('v') || new Date().toISOString().slice(0,10).replace(/-/g,'') : String(Date.now())

const VERSION = `kynthai-${DEPLOY_ID}`
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
      // Delete ALL old caches immediately on new install
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
      const cache = await caches.open(STATIC_CACHE)
      try {
        await cache.addAll(PRECACHE_URLS)
      } catch (e) {
        console.warn('[sw] precache partial failure', e)
      }
      await self.skipWaiting()
    })(),
  )
})

// ---------------------------------------------------------------------------
// Activate: claim all clients immediately and delete any leftover old caches
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
      // Notify all clients that a new SW is active so they can reload
      const clients = await self.clients.matchAll()
      clients.forEach((client) => {
        client.postMessage({ type: 'SW_ACTIVATED', version: VERSION })
      })
      // Force all clients to reload immediately
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
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return

  // Never cache Next.js internal URLs (chunks, API, etc) — always network
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/')
  ) return

  // 1. Navigation requests: ALWAYS try network first, never serve stale HTML.
  // This prevents iOS Safari from restoring with an old cached HTML shell
  // whose JS chunk references no longer exist.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req, { cache: 'no-cache' })
          if (fresh && fresh.ok) {
            // Check if the HTML has the correct deploy version
            const html = await fresh.clone().text()
            const versionMatch = html.match(/data-deploy-version="([^"]*)"/)
            const htmlVersion = versionMatch ? versionMatch[1] : null
            if (htmlVersion && htmlVersion !== VERSION) {
              console.warn('[sw] HTML version mismatch, forcing reload')
              return new Response('', { status: 204 }) // Trigger reload
            }
            // Only cache a fresh response for OFFLINE fallback — TTL is short
            const cache = await caches.open(RUNTIME_CACHE)
            cache.put(req, fresh.clone()).catch(() => {})
          }
          return fresh
        } catch (e) {
          // Offline: try the runtime cache, then offline page, then plain text
          const cache = await caches.open(RUNTIME_CACHE)
          let fallback = await cache.match(req)
          if (!fallback) fallback = await cache.match('/offline.html')
          if (fallback) return fallback
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

  // 3. Anything else → network-first (don't cache stale data).
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
        const cached = await cache.match(req)
        if (cached) return cached
        return new Response('', { status: 504 })
      }
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

// ---------------------------------------------------------------------------
// Message handler — respond to version checks from the page.
// ---------------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data?.type === 'GET_VERSION' && event.ports?.[0]) {
    event.ports[0].postMessage(VERSION)
  }
})

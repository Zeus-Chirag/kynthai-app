'use client'

export function initConsentAwareTelemetry() {
  if (typeof window === 'undefined') return

  try {
    const raw = localStorage.getItem('kyntha-consent')
    if (!raw) return
    const consent = JSON.parse(raw)
    const analyticsEnabled = !!consent.analytics
    const errorTrackingEnabled = !!consent.errorTracking

    if (analyticsEnabled) {
      import('./analytics').then(({ analytics }) => analytics.init()).catch(() => {})
    }
    if (errorTrackingEnabled) {
      import('./sentry').then(({ initSentry }) => initSentry()).catch(() => {})
      import('./error-tracking').then((m) => m.errorTracking?.init?.()).catch(() => {})
    }
  } catch {
    // ignore storage/parse errors
  }
}

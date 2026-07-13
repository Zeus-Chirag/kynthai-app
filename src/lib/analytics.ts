import { initConsentAwareTelemetry } from './analytics-consent'

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
'use client'

export const analytics = {
  // Call this on app initialization
  init() {
    if (typeof window === 'undefined') return
    
    // Mixpanel
    if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
      this.loadScript('https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js')
    }
  },

  // Track events
  track(eventName: string, properties?: Record<string, unknown>) {
    if (typeof window === 'undefined') return
    
    // Mixpanel
    if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN && (window as any).mixpanel) {
      (window as any).mixpanel.track(eventName, properties)
    }
  },

  // Identify users
  identify(userId: string, traits?: Record<string, unknown>) {
    if (typeof window === 'undefined') return
    
    if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN && (window as any).mixpanel) {
      (window as any).mixpanel.identify(userId)
      if (traits) {
        (window as any).mixpanel.people.set(traits)
      }
    }
  },

  // Load external script
  loadScript(src: string) {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    document.head.appendChild(script)
  },
}

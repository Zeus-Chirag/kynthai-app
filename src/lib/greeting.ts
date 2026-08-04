import * as React from 'react'

/**
 * Returns a time-appropriate greeting.
 * Falls back to English when no locale strings are provided.
 */
type GreetingEntry = { morning: string; afternoon: string; evening: string }

const GREETINGS: Record<string, GreetingEntry> = {
  en: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' },
  hi: { morning: 'सुप्रभात', afternoon: 'नमस्कार', evening: 'शुभ संध्या' },
}

export function getGreeting(locale?: string): string {
  const h = new Date().getHours()
  const lang = (locale ?? 'en').startsWith('hi') ? 'hi' : 'en'
  const g: GreetingEntry = (GREETINGS[lang] ?? GREETINGS.en)!
  if (h < 12) return g.morning
  if (h < 18) return g.afternoon
  return g.evening
}

/**
 * Hydration-safe greeting for client components.
 *
 * React error #418 (server text != client text) fires when render-time code
 * reads the clock: the server (or an ISR-cached page) bakes one greeting into
 * the HTML and the client computes another across an hour boundary. This hook
 * renders a deterministic neutral value on every first render (server and
 * client), then evaluates the time-based greeting only after mount, so the two
 * hydration passes can never disagree.
 */
export function useGreeting(locale?: string): string {
  const [greeting, setGreeting] = React.useState('Hello')
  React.useEffect(() => {
    setGreeting(getGreeting(locale))
  }, [locale])
  return greeting
}

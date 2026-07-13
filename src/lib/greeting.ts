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

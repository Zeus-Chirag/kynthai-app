/**
 * Static guards against the React #418 hydration-mismatch class.
 *
 * React error #418 ("server text didn't match the client") fires when the
 * server-rendered HTML text differs from the client's first render. The top
 * documented causes are render-time clock reads, locale-formatting calls, and
 * server/client branches. These source-read assertions (same pattern as
 * motion-system.test.ts) lock in the fix:
 *
 *   1. Time-based greetings are only produced through the hydration-safe
 *      useGreeting() hook (deterministic neutral value until mount), never by
 *      calling getGreeting() directly during render.
 *   2. No bare, locale-omitted toLocaleDateString()/toLocaleString("default")
 *      renders remain in client components (locale-less formatting depends on
 *      the browser's locale and can differ from the server's).
 *   3. Year-bearing footer text is marked suppressHydrationWarning so a page
 *      cached across a year boundary cannot fail hydration.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const read = (p: string) => readFileSync(join(ROOT, p), 'utf-8')

const PORTAL_FILES = [
  'src/components/kynthai/caretaker/caretaker-app.tsx',
  'src/components/kynthai/doctor/doctor-dashboard.tsx',
  'src/components/kynthai/patient/patient-app.tsx',
  'src/components/kynthai/priorities/daily-priorities.tsx',
]

describe('hydration safety (React #418)', () => {
  it('greeting.ts exports useGreeting and never renders a clock-read value', () => {
    const src = read('src/lib/greeting.ts')
    expect(src).toMatch(/export function useGreeting\(/)
    // Deterministic initial value for BOTH hydration passes.
    // Plain-substring check: matches both `React.useState('Hello')` and a
    // named `useState('Hello')` import, so a legitimate import refactor
    // does not false-fail the guard.
    expect(src).toContain("useState('Hello')")
    // …and the time-based greeting is only computed after mount.
    expect(src).toContain('useEffect(')
    expect(src).toMatch(/setGreeting\(getGreeting\(locale\)\)/)
  })

  it('no client component renders getGreeting() directly during render', () => {
    for (const file of PORTAL_FILES) {
      const src = read(file)
      expect(src).toContain("useGreeting")
      // After the fix the only legal usage is {greeting} (state), never the
      // raw clock-reading function inside JSX.
      expect(src).not.toMatch(/\{getGreeting\(\)\}/)
    }
    // The local clock-reading copy in daily-priorities is gone.
    const dp = read('src/components/kynthai/priorities/daily-priorities.tsx')
    expect(dp).not.toMatch(/function getGreeting\(\)/)
  })

  it('no bare locale-omitted date formatting remains in client components', () => {
    // Every locale-less date render was pinned to en-US so server and client
    // always agree regardless of the user's browser locale.
    const files = [
      'src/components/kynthai/consultation-prep.tsx',
      'src/components/kynthai/medicine-cabinet.tsx',
      'src/components/kynthai/family/family-circle.tsx',
      'src/components/kynthai/family/health-feed.tsx',
      'src/components/ui/calendar.tsx',
    ]
    for (const file of files) {
      const src = read(file)
      expect(src).not.toMatch(/toLocaleDateString\(\)/)
      expect(src).not.toMatch(/toLocaleString\("default"/)
    }
  })

  it('footer year text is suppressHydrationWarning-marked', () => {
    const landing = read('src/components/kynthai/landing-footer.tsx')
    const portal = read('src/components/kynthai/portal-footer.tsx')
    // The <p suppressHydrationWarning> opening tag may share the year line or
    // sit directly above it, so inspect a small window around the year text.
    const yearIsMarked = (src: string) => {
      const lines = src.split('\n')
      const idx = lines.findIndex(l => l.includes('new Date().getFullYear()'))
      if (idx === -1) return false
      const window_ = lines.slice(Math.max(0, idx - 2), idx + 1).join('\n')
      return window_.includes('suppressHydrationWarning')
    }
    expect(yearIsMarked(landing)).toBe(true)
    expect(yearIsMarked(portal)).toBe(true)
  })

  it('no shipped component renders clock-derived TEXT without a suppression guard', () => {
    // doctor-dashboard's paywall line derives "Renews on <date>" from a
    // useState(() => new Date()) initializer — a render-path clock read that
    // could differ across a day boundary. The <p> must stay suppress-marked.
    const dd = read('src/components/kynthai/doctor/doctor-dashboard.tsx')
    const idx = dd.indexOf('Renews on')
    // The opening <p suppressHydrationWarning> sits just BEFORE the text.
    const renewsBlock = dd.slice(Math.max(0, idx - 200), idx + 160)
    expect(renewsBlock).toContain('suppressHydrationWarning')
  })
})

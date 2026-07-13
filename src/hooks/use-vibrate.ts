'use client'

/**
 * Vibration helpers built on `navigator.vibrate`.
 *
 * `vibrate(pattern)` — fire a vibration immediately (no-op on unsupported
 *   browsers, e.g. iOS Safari).
 *
 * `useVibrateOnTrigger(trigger, pattern)` — re-fire the vibration whenever
 *   `trigger` changes (truthy → next truthy). Useful for vibrating on new
 *   reminders, missed doses, SOS events, etc.
 */

import * as React from 'react'

export type VibratePattern = number | number[]

/**
 * Vibrate the device. Silently no-ops on browsers without `navigator.vibrate`
 * (Safari, iOS browsers, desktop browsers).
 *
 * @example
 *   vibrate(200)
 *   vibrate([100, 50, 100])
 */
export function vibrate(pattern: VibratePattern = 200): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return false
  }
  try {
    return navigator.vibrate(pattern) ?? false
  } catch {
    return false
  }
}

/**
 * Re-fire the vibration pattern whenever `trigger` changes to a new truthy
 * value.
 *
 * @example
 *   // Vibrate whenever a new reminder arrives.
 *   useVibrateOnTrigger(reminder?.id, [100, 50, 200])
 */
export function useVibrateOnTrigger(trigger: unknown, pattern: VibratePattern = 200): void {
  const lastTrigger = React.useRef<unknown>(trigger)
  React.useEffect(() => {
    if (trigger && trigger !== lastTrigger.current) {
      vibrate(pattern)
    }
    lastTrigger.current = trigger
  }, [trigger, pattern])
}

/**
 * Re-fire the vibration pattern whenever the supplied function returns a new
 * truthy value. Convenient when you want to derive the trigger from data
 * without recomputing it at the call site.
 */
export function useVibrateWhen(shouldVibrate: () => boolean, pattern: VibratePattern = 200, deps: React.DependencyList = []): void {
  const lastFired = React.useRef<boolean>(false)
  React.useEffect(() => {
    const now = shouldVibrate()
    if (now && !lastFired.current) {
      vibrate(pattern)
    }
    lastFired.current = now
  }, deps)
}

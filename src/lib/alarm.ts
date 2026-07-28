/**
 * Kynthai Ringtone System
 * -----------------------
 * Generates in-app alarm sounds using the Web Audio API — no audio files needed.
 *
 * Two modes:
 *   "professional" — gentle ascending chime (hospital-grade, polite)
 *   "alert"        — louder repeating beep for elderly users
 *
 * The user can toggle alarm on/off from settings and dismiss it with a button.
 */

let audioCtx: AudioContext | null = null
let activeOscillators: OscillatorNode[] = []
let _isRinging = false

/**
 * SSR-safe AudioContext accessor.
 * Returns null when called during server-side rendering.
 */
function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/** Play a single tone — tracks the oscillator so it can be stopped. */
function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume = 0.3,
  type: OscillatorType = 'sine',
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, startTime)
  gain.gain.setValueAtTime(volume, startTime)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(startTime)
  osc.stop(startTime + duration)
  activeOscillators.push(osc)
  // Remove from tracking when it naturally finishes
  osc.onended = () => {
    activeOscillators = activeOscillators.filter((o) => o !== osc)
    if (activeOscillators.length === 0) {
      _isRinging = false
    }
  }
}

/** Whether a ringtone is currently playing. */
export function isAlarmRinging(): boolean {
  return _isRinging
}

/** Immediately stop all active ringtones. */
export function stopAllRingtones() {
  for (const osc of activeOscillators) {
    try { osc.stop() } catch { /* already stopped */ }
  }
  activeOscillators = []
  _isRinging = false
}

/**
 * Play the professional ringtone — gentle ascending chime.
 * Loops the melody to fill approximately 10 seconds.
 */
export function playProfessionalRingtone() {
  try {
    stopAllRingtones()
    _isRinging = true
    const ctx = getAudioCtx()
    if (!ctx) return
    const now = ctx.currentTime

    // Each cycle is ~1.2s. 8 cycles = ~9.6s ≈ 10 seconds.
    for (let cycle = 0; cycle < 8; cycle++) {
      const t = now + cycle * 1.25
      playTone(ctx, 523.25, t, 0.4, 0.22, 'sine')         // C5
      playTone(ctx, 659.25, t + 0.15, 0.4, 0.22, 'sine')  // E5
      playTone(ctx, 783.99, t + 0.3, 0.6, 0.22, 'sine')   // G5
      playTone(ctx, 1046.5, t + 0.7, 0.5, 0.15, 'sine')   // C6
    }
  } catch {
    _isRinging = false
  }
}

/**
 * Play the alert ringtone — louder repeating beep for elderly users.
 * Repeats the beep pattern to fill approximately 10 seconds.
 */
export function playAlertRingtone() {
  try {
    stopAllRingtones()
    _isRinging = true
    const ctx = getAudioCtx()
    if (!ctx) return
    const now = ctx.currentTime

    // Each beep group takes ~0.35s. ~28 groups = ~9.8s ≈ 10 seconds.
    // Each group: a sharp square-wave A5 + a softer sine E5 overlay.
    for (let i = 0; i < 28; i++) {
      const t = now + i * 0.35
      playTone(ctx, 880, t, 0.25, 0.45, 'square')
      playTone(ctx, 660, t + 0.08, 0.18, 0.2, 'sine')
    }
  } catch {
    _isRinging = false
  }
}

/**
 * Play a single gentle chime — for when a medication is marked as taken.
 */
export function playSuccessChime() {
  try {
    // Don't stop existing ringtone — success chime plays on top
    const ctx = getAudioCtx()
    if (!ctx) return
    const now = ctx.currentTime

    playTone(ctx, 783.99, now, 0.15, 0.2, 'sine')   // G5
    playTone(ctx, 1046.5, now + 0.1, 0.25, 0.2, 'sine') // C6
  } catch {
    // silently ignore
  }
}

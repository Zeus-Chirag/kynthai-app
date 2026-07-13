import { NextRequest, NextResponse } from 'next/server'

const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
// E.164: +[country code][number] — max 15 digits after +
const E164_RE = /^\+[1-9]\d{6,14}$/

export function isValidEmail(email: string): boolean {
  return typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email)
}

export function isValidE164(phone: string): boolean {
  return typeof phone === 'string' && E164_RE.test(phone.trim())
}

export function sanitizeText(input: unknown, maxLen = 1000): string {
  if (typeof input !== 'string') return ''
  return input.replace(/[\x00-\x1F\x7F]/g, '').replace(/<[^>]*>/g, '').trim().slice(0, maxLen)
}

// ── Rate limiting — re-exported from rate-limit.ts (single source of truth) ──
export { rateLimit, rateLimitProduction, getIp } from '@/lib/rate-limit'

// ── Password strength ──────────────────────────────────────────────────
const SPECIAL_RE = /[!@#$%^&*()_+\-=\[\]{}|;:',.<>?]/

export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (password.length < 8) errors.push('At least 8 characters')
  if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter')
  if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter')
  if (!/\d/.test(password)) errors.push('At least one number')
  if (!SPECIAL_RE.test(password)) errors.push('At least one special character (!@#$%^&*()_+-=[]{}|;:\',.<>?)')
  return { valid: errors.length === 0, errors }
}

// ── PII masking ──────────────────────────────────────────────────────
// Generic sensitive-value formatter.
export function maskIdLike(value: string | null | undefined): string {
  if (!value) return '—'
  const v = String(value).trim()
  if (v.length <= 4) return 'XXXX-' + v.slice(-4)
  return 'XXXX-' + v.slice(-4)
}

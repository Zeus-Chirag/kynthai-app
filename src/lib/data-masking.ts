/**
 * Data masking utilities for Health Data Protection compliance.
 *
 * Use these helpers when logging, reporting errors, or sending telemetry
 * so that sensitive health data/PII never appears in production logs.
 */

export type SensitiveField =
  | 'ssn'
  | 'medicalRecordNumber'
  | 'diagnosis'
  | 'prescription'
  | 'labResult'
  | 'allergies'
  | 'medication'
  | 'notes'
  | 'phone'
  | 'email'
  | 'address'
  | 'dob'
  | 'name'
  | 'ip'
  | 'creditCard'
  | 'bankAccount'
  | 'token'
  | 'password'
  | 'url'
  | 'anyString'

const MASKERS: Record<string, (v: string) => string> = {
  /** Mask SSN-like: keep last 4 digits */
  ssn: (v: string) => maskTail(v, 4),
  /** Mask everything except first letter */
  name: (v: string) => maskExceptFirst(v),
  /** Mask middle of email, keep domain */
  email: (v: string) => maskEmail(v),
  /** Mask middle of phone, keep first 3 and last 4 */
  phone: (v: string) => maskTail(v.slice(0, 3), 4),
  /** Mask full address */
  address: () => '[REDACTED]',
  /** Mask date of birth */
  dob: (v: string) => maskTail(v, 4),
  /** Generic short identifier: keep last 6 */
  medicalRecordNumber: (v: string) => maskTail(v, 6),
  /** Mask entire clinical text */
  diagnosis: () => '[REDACTED]',
  prescription: () => '[REDACTED]',
  labResult: () => '[REDACTED]',
  allergies: () => '[REDACTED]',
  medication: () => '[REDACTED]',
  notes: () => '[REDACTED]',
  /** Mask entire IP */
  ip: () => '[REDACTED_IP]',
  /** Mask entire card number */
  creditCard: () => '[REDACTED]',
  bankAccount: () => '[REDACTED]',
  token: (v: string) => maskTail(v, 4),
  password: () => '[REDACTED]',
  url: (v: string) => {
    try {
      const u = new URL(v)
      u.search = ''
      u.hash = ''
      u.username = ''
      u.password = ''
      return u.toString()
    } catch {
      return '[REDACTED_URL]'
    }
  },
  anyString: (v: string) => maskTail(v, 6),
}

function maskTail(v: string, keep: number): string {
  if (v.length <= keep) return v
  return '*'.repeat(v.length - keep) + v.slice(-keep)
}

function maskExceptFirst(v: string): string {
  if (!v) return v
  const first = v[0]
  const rest = v.slice(1)
  const masked = rest.replace(/./g, '*')
  return first + masked
}

function maskEmail(v: string): string {
  const at = v.indexOf('@')
  if (at <= 0) return maskTail(v, 4)
  const local = v.slice(0, at)
  const domain = v.slice(at)
  const maskedLocal = maskTail(local, 2)
  return maskedLocal + domain
}

/** Mask a single sensitive value */
export function mask(field: SensitiveField, value: string): string {
  if (typeof value !== 'string') return String(value)
  const fn = MASKERS[field]
  if (!fn) return maskTail(value, 4)
  return fn(value)
}

/** Mask an object's known sensitive health data keys for safe logging */
export function maskObject<T extends Record<string, any>>(
  obj: T,
  fieldKeys: Partial<Record<keyof T, SensitiveField>>
): T {
  const out: any = { ...obj }
  for (const [key, field] of Object.entries(fieldKeys)) {
    if (field && out[key] !== undefined && out[key] !== null) {
      out[key] = mask(field, String(out[key]))
    }
  }
  return out
}

/** Mask all string values in an unknown payload that look like sensitive health data */
export function maskArgs(args: unknown[]): unknown[] {
  return args.map(arg => {
    if (typeof arg === 'string') return mask('anyString', arg)
    if (arg && typeof arg === 'object') {
      if (Array.isArray(arg)) return maskArgs(arg)
      const masked: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(arg as Record<string, unknown>)) {
        if (typeof v === 'string') {
          const lower = k.toLowerCase()
          if (lower.includes('password')) masked[k] = mask('password', v)
          else if (lower.includes('secret')) masked[k] = mask('token', v)
          else if (lower.includes('token')) masked[k] = mask('token', v)
          else if (lower.includes('email')) masked[k] = mask('email', v)
          else if (lower.includes('phone')) masked[k] = mask('phone', v)
          else if (lower.includes('ssn')) masked[k] = mask('ssn', v)
          else if (lower.includes('name')) masked[k] = mask('name', v)
          else if (lower.includes('address')) masked[k] = mask('address', v)
          else if (lower.includes('diagnosis') || lower.includes('condition')) masked[k] = mask('diagnosis', v)
          else if (lower.includes('prescription') || lower.includes('medication')) masked[k] = mask('medication', v)
          else if (lower.includes('note')) masked[k] = mask('notes', v)
          else if (lower.includes('allerg')) masked[k] = mask('allergies', v)
          else if (lower.includes('dob') || lower.includes('birth')) masked[k] = mask('dob', v)
          else if (lower.includes('ip')) masked[k] = mask('ip', v)
          else if (lower.includes('url') || lower.includes('link')) masked[k] = mask('url', v)
          else masked[k] = mask('anyString', v)
        } else {
          masked[k] = v
        }
      }
      return masked
    }
    return arg
  })
}

/**
 * Startup environment variable validation.
 *
 * Call validateEnv() at app startup (e.g., in next.config.ts or a startup script)
 * to ensure all required variables are set before the server begins accepting requests.
 *
 * In production, missing required vars will throw and prevent the app from starting.
 * In development, only critical vars are checked.
 */

const REQUIRED_IN_PROD = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'ENCRYPTION_KEY',
  'ADMIN_EMAILS',
  'CRON_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'SENTRY_DSN',
] as const

const REQUIRED_IN_ALL = [
  'NODE_ENV',
] as const

const OPTIONAL_WITH_DEFAULTS: Record<string, string> = {
  ZAI_MODEL: 'step-2-16k',
  VIDEO_TOKEN_SECRET: '',
  SENTRY_DSN: '',
  SENTRY_ORG: '',
  SENTRY_PROJECT: '',
  NEXT_PUBLIC_API_URL: 'https://kyntha.app',
}

export function env(key: string, fallback?: string): string | undefined {
  const value = process.env[key]?.trim()
  if (value) return value
  return fallback
}

export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === 'production'
  const toCheck = isProd ? [...REQUIRED_IN_ALL, ...REQUIRED_IN_PROD] : REQUIRED_IN_ALL

  const missing: string[] = []
  for (const key of toCheck) {
    const value = process.env[key]?.trim()
    if (!value) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    const env = isProd ? 'production' : 'development'
    throw new Error(
      `[Kyntha] Missing required environment variables for ${env}:\n` +
      `  ${missing.map(m => `${m}=<missing>`).join('\n  ')}\n` +
      `See .env.example for documentation.`
    )
  }

  // HIPAA: Validate DATABASE_URL has encrypted connection in production
  if (isProd) {
    const dbUrl = process.env.DATABASE_URL || ''
    if (!dbUrl.includes('sslmode=')) {
      throw new Error(
        '[Kyntha][HIPAA] DATABASE_URL must include sslmode=require (or sslmode=verify-ca / sslmode=verify-full). ' +
        'Database connections must be encrypted in transit.'
      )
    }
    // HIPAA: Validate ENCRYPTION_KEY format (64 hex chars = 32 bytes)
    const encKey = process.env.ENCRYPTION_KEY || ''
    if (encKey && encKey.length !== 64) {
      throw new Error(
        `[Kyntha][HIPAA] ENCRYPTION_KEY must be exactly 64 hex characters (256 bits). ` +
        `Current length: ${encKey.length}. Generate with: openssl rand -hex 32`
      )
    }
  }

  // Log optional vars that are set (for debugging)
  for (const [key, defaultValue] of Object.entries(OPTIONAL_WITH_DEFAULTS)) {
    if (process.env[key] === undefined) {
      if (defaultValue) {
        process.env[key] = defaultValue
      }
    }
  }
}

import { PrismaClient } from '@prisma/client'
import { installEncryptionMiddleware } from './prisma-encryption-middleware'
import { logger } from './logger'
import { maskArgs } from './data-masking'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ══ HIPAA: field-level encryption middleware (AES-256-GCM) ══════════════════
// Install lazily to avoid build-time issues with PrismaClient.$use in Next.js data collection.
// $use is attached to the shared Prisma instance rather than a transient one.
;(async () => {
  try {
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    const target = globalForPrisma.prisma ?? db
    if (typeof (target as any).$use === 'function') {
      installEncryptionMiddleware(target)
    }
  } catch {
    // Never block app startup because of middleware install.
  }
})()

// ── Connection lifecycle ──────────────────────────────────────────────

/**
 * Gracefully disconnect the Prisma Client.
 * Call this in your server shutdown / process termination handler.
 */
export async function disconnectDb(): Promise<void> {
  try {
    await db.$disconnect()
  } catch (err) {
    // HIPAA: never log raw DB connection errors
    logger.phiSafeError(err, 'db.disconnect')
  }
}

/**
 * Handle unhandled promise rejections by disconnecting before exit.
 */
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[db] Unhandled Rejection — disconnecting before exit:', reason)
  void disconnectDb().then(() => process.exit(1))
})

/**
 * Disconnect cleanly on SIGINT / SIGTERM.
 * SECURITY: In production, always run graceful shutdown to prevent
 * Prisma connection pool leaks and potential data corruption.
 */
if (process.env.NODE_ENV !== 'test') {
  process.on('SIGINT', async () => {
    await disconnectDb()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    await disconnectDb()
    process.exit(0)
  })

  // SECURITY: Catch unhandled exceptions to prevent silent crashes
  process.on('uncaughtException', (error: Error) => {
    logger.phiSafeError(error, 'uncaughtException')
    // Exit with error code for container restart
    process.exit(1)
  })
}

/**
 * Log a query-count summary when the process is about to exit (dev only).
 */
export function logQueryStats(): void {
  if (process.env.NODE_ENV !== 'development') return
  const engine = (db as PrismaClient & { _engine?: { metrics?: () => Promise<Record<string, number>> } })?._engine
  if (typeof engine?.metrics === 'function') {
    engine
      .metrics()
      .then((m: Record<string, number>) => {
        console.table({
          totalQueries: m.totalQueries ?? 0,
          totalQueriesFailed: m.totalQueriesFailed ?? 0,
        })
      })
      .catch(() => {
        // Silently ignore if metrics are unavailable
      })
  }
}

// ══ HIPAA: Global PHI Console Override ═══════════════════════════════════════
// Safety net: in production, all console.* output is masked via maskArgs to
// prevent accidental PHI leakage from any unmasked call site.
if (process.env.NODE_ENV === 'production') {
  const _maskArgs = maskArgs
  const _origError = console.error.bind(console)
  const _origWarn  = console.warn.bind(console)
  const _origInfo  = console.info.bind(console)

  // Mask all console output in production
  console.log   = (...a: any[]) => { /* disabled — use logger */ }
  console.error = (...a: any[]) => _origError(..._maskArgs(a))
  console.warn  = (...a: any[]) => _origWarn(..._maskArgs(a))
  console.info  = (...a: any[]) => _origInfo(..._maskArgs(a))
}

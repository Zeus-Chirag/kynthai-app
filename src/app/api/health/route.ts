import { NextRequest, NextResponse } from 'next/server'
import { applyStandardHeaders } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const checks: Record<string, string> = {}
  let healthy = true

  // Check database connectivity
  try {
    const { db } = await import('@/lib/db')
    await db.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch (err) {
    checks.database = `error: ${err instanceof Error ? err.message : String(err)}`
    healthy = false
    logger.phiSafeError(err, 'health_check.db')
  }

  // Check environment
  checks.env = process.env.NODE_ENV || 'unknown'
  checks.uptime = `${Math.floor(process.uptime())}s`

  // Build metadata
  const version = process.env.NEXT_PUBLIC_APP_VERSION || '0.2.0'
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || 'dev'

  const status = healthy ? 200 : 503
  const res = NextResponse.json({
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version,
    commitSha,
    checks,
  }, { status })

  applyStandardHeaders(res, req)
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.headers.set('Pragma', 'no-cache')
  res.headers.set('Expires', '0')
  return res
}

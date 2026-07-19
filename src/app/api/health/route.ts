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
    checks.database = 'error'
    healthy = false
    logger.phiSafeError(err, 'health_check.db')
  }

  // Check environment
  checks.env = process.env.NODE_ENV || 'unknown'
  checks.uptime = `${Math.floor(process.uptime())}s`

  const status = healthy ? 200 : 503
  const res = NextResponse.json({
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  }, { status })

  applyStandardHeaders(res, req)
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.headers.set('Pragma', 'no-cache')
  res.headers.set('Expires', '0')
  return res
}

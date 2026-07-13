import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { applyStandardHeaders } from '@/lib/api-helpers'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  // HIPAA: audit health check endpoint (no user - system-level)
  logger.info('health_check', JSON.stringify({ method: 'GET', path: '/api/health' }))
  try {
    // Check DB connectivity without raw SQL
    await db.user.count()

    const res = NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
    // PHI-safe cache headers even on healthy response
    applyStandardHeaders(res, req)
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.headers.set('Pragma', 'no-cache')
    res.headers.set('Expires', '0')
    return res
  } catch {
    const res = NextResponse.json(
      { status: 'error', timestamp: new Date().toISOString(), uptime: process.uptime() },
      { status: 503 }
    )
    applyStandardHeaders(res, req)
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.headers.set('Pragma', 'no-cache')
    res.headers.set('Expires', '0')
    return res
  }
}

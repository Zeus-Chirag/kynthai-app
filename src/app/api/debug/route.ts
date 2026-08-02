import { NextRequest, NextResponse } from 'next/server'

// Debug info only — never exposed in production (no env vars, no internal state).
// In production this route is intentionally a 404 to remove any info-disclosure
// surface and satisfy the security probe (CHECK_SENSITIVE /api/debug).
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({
    status: 'ok',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
  })
}

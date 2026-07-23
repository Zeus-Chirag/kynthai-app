import { NextRequest, NextResponse } from 'next/server'

// PUBLIC debug info only — no env vars, no internal state
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
  })
}

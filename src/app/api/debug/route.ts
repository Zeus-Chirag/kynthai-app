import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const hasDbUrl = !!process.env.DATABASE_URL
    const dbUrlStart = process.env.DATABASE_URL?.substring(0, 20) || 'undefined'
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasSupabaseAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const nodeEnv = process.env.NODE_ENV

    return NextResponse.json({
      env: nodeEnv,
      hasDbUrl,
      dbUrlStart,
      hasSupabaseUrl,
      hasSupabaseAnon,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
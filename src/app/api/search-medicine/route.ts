import { NextRequest, NextResponse } from 'next/server'
import { getNvidia, isAiAvailable } from '@/lib/nvidia'
import { requireAuth, jsonError } from '@/lib/api-helpers'
import { logAudit } from '@/lib/auth'
import { sanitizeText } from '@/lib/security'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

// SECURITY: cap query length to prevent prompt-inflation in web_search.
const MAX_QUERY_LEN = 200

// GET /api/search-medicine?q=<query>&num=8
export async function GET(req: NextRequest) {
  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  const u = user!

  await logAudit(user.id, 'medicine.search', { resourceType: 'Medication' })

  try {
    const qRaw = req.nextUrl.searchParams.get('q') || ''
    const q = sanitizeText(qRaw, MAX_QUERY_LEN)
    const num = parseInt(req.nextUrl.searchParams.get('num') || '8', 10)

    if (!q) {
      return NextResponse.json(
        { error: 'q (query) is required' },
        { status: 400 }
      )
    }

    if (!isAiAvailable()) return NextResponse.json({ results: [], warning: "Set NVIDIA_API_KEY in .env for AI-powered web search" })
    const nvidia = await getNvidia()

    // NVIDIA NIM does not host OpenAI's server-side `functions.invoke('web_search')`
    // tool, so AI web search is not available with this provider. Return empty
    // results — the UI already handles the empty state.
    const results: { name: string; url: string; snippet: string }[] = []
    return NextResponse.json({ results, query: q })
  } catch (error) {
    logger.phiSafeError(error)
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    )
  }
}

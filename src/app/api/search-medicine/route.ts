import { NextRequest, NextResponse } from 'next/server'
import { getZai, isAiAvailable } from '@/lib/zai'
import { requireAuth, jsonError } from '@/lib/api-helpers'
import { logAudit } from '@/lib/auth'
import { sanitizeText } from '@/lib/security'
import { withAiTimeout, AiTimeoutError, AI_TIMEOUTS } from '@/lib/ai-timeout'
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

    if (!isAiAvailable()) return NextResponse.json({ results: [], warning: "Set ZENMUX_API_KEY in .env for AI-powered web search" })
    const zai = await getZai()

    try {
      const results = await withAiTimeout(
        (zai as unknown as any).functions.invoke('web_search', {
          query: `${q} medicine uses side effects dosage`,
          num: Math.min(Math.max(num, 1), 15),
        }),
        AI_TIMEOUTS.SEARCH,
      )
      return NextResponse.json({ results, query: q })
    } catch (err) {
      // If the function invocation itself fails (e.g. provider 400),
      // fall back to returning empty results so the UI still works.
      if (err instanceof AiTimeoutError) {
        logger.phiSafeError(err)
      } else {
        logger.phiSafeError(err)
      }
      return NextResponse.json({ results: [], query: q })
    }
  } catch (error) {
    logger.phiSafeError(error)
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    )
  }
}

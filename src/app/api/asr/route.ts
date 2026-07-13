import { NextRequest, NextResponse } from 'next/server'
import { getZai, ZAI_MODEL, isAiAvailable } from '@/lib/zai'
import { requireAuth, requireAuthWithCsrf, jsonError, readJson, checkAiTier } from '@/lib/api-helpers'
import { logAudit } from '@/lib/auth'
import { withAiTimeout, AiTimeoutError, AI_TIMEOUTS } from '@/lib/ai-timeout'
import { logger } from '@/lib/logger'
// Prevent static generation — reads session + DB at runtime
export const dynamic = 'force-dynamic'

// SECURITY: cap audio payload to ~10 MB encoded base64 to prevent memory
// exhaustion / cost-abuse DoS via huge audio files.
const MAX_AUDIO_BASE64_LEN = 10 * 1024 * 1024 // ~10 MB encoded (≈7.5 MB raw)

export async function POST(req: NextRequest) {
  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!
  const u = user!

  await logAudit(user.id, 'asr.transcribe', { resourceType: 'HealthJournal' })

  const tierErr = await checkAiTier(user, 'transcription')
  if (tierErr) return tierErr

  try {
    const body = await readJson<{ audio?: unknown }>(req)
    if (!body) return jsonError('Invalid JSON', 400)

    if (typeof body.audio !== 'string' || !body.audio) {
      return NextResponse.json(
        { error: 'audio (base64) is required' },
        { status: 400 }
      )
    }
    // SECURITY: reject oversized payloads before calling the ASR API.
    if (body.audio.length > MAX_AUDIO_BASE64_LEN) {
      return NextResponse.json(
        { error: 'Audio payload too large (max 10 MB encoded)' },
        { status: 413 }
      )
    }

    // Strip data URI prefix if present
    const base64 = body.audio.replace(/^data:audio\/\w+;base64,/, '')

    if (!isAiAvailable()) return jsonError('AI speech-to-text requires ZENMUX_API_KEY in .env', 503, 'AI_NOT_CONFIGURED')
    const zai = await getZai()

    const aiResponse = await withAiTimeout(
      (zai.audio as any).transcribe({
        model: ZAI_MODEL,
        file_base64: base64,
      }),
      AI_TIMEOUTS.MEDIA
    )

    return NextResponse.json({ text: typeof aiResponse === 'object' && aiResponse ? (aiResponse as any).text ?? '' : '' })
  } catch (error) {
    logger.phiSafeError(error)
    if (error instanceof AiTimeoutError) {
      return NextResponse.json(
        { error: 'Transcription timed out. Please try again.' },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}

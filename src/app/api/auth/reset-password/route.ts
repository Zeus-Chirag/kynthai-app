import { NextRequest } from 'next/server'
import { consumePasswordResetToken } from '@/lib/auth'
import { logAudit } from '@/lib/auth'
import { rateLimit } from '@/lib/security'
import { jsonError, jsonOk } from '@/lib/api-helpers'
import { z } from 'zod'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

const ResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  const fwdFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  try {
    const limited = await rateLimit(req, 5, 60000, { globalKey: true })
    if (limited) return limited

    const body = await req.json().catch(() => null)
    const parsed = ResetSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError('Invalid request', 400, 'VALIDATION_ERROR')
    }

    const { token, password } = parsed.data

    // SECURITY: delegate to lib/auth.ts single source of truth.
    // consumePasswordResetToken() uses hashToken() which shares the same
    // SESSION_SECRET and HMAC parameters as the forgot-password endpoint.
    // This eliminates the previous bug where independent HMAC derivations
    // used different fallback secrets ('dev-secret' ≠ auth.ts fallback).
    const result = await consumePasswordResetToken(token, password)
    if (!result.ok) {
      // Note: consumePasswordResetToken already logs failed reset attempts via logAudit
      return jsonError(result.error || 'Invalid or expired reset token', 400, 'INVALID_TOKEN')
    }

    return jsonOk({ message: 'Password reset successful' })
  } catch (error) {
    // HIPAA: never leak stack traces, raw tokens, or SESSION_SECRET
    logger.phiSafeError(error, 'auth.reset-password')
    return jsonError('Internal server error', 500, 'INTERNAL_ERROR')
  }
}

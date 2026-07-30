import { NextRequest } from 'next/server'
import { createMfaChallenge } from '@/lib/mfa'
import { jsonError, jsonOk, applyStandardHeaders, readJson } from '@/lib/api-helpers'
import { rateLimit } from '@/lib/security'
import { checkCsrf } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/mfa/challenge
 * Create an MFA challenge for a given factor.
 * Body: { factorId: string }
 * Returns challengeId that must be passed to /api/auth/mfa/verify.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 10, 60000)
    if (limited) return limited

    const csrfErr = await checkCsrf(req)
    if (csrfErr) return csrfErr

    const raw = await readJson<{ factorId: string }>(req)
    if (!raw?.factorId) {
      return jsonError('factorId is required', 400)
    }

    const result = await createMfaChallenge(req, raw.factorId)
    return jsonOk(result)
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return jsonError('Authentication required', 401)
    }
    return jsonError(error?.message || 'MFA challenge failed', 400)
  }
}

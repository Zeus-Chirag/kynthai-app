import { NextRequest } from 'next/server'
import { verifyMfaFactor } from '@/lib/mfa'
import { jsonError, jsonOk, applyStandardHeaders, readJson } from '@/lib/api-helpers'
import { rateLimit } from '@/lib/security'
import { checkCsrf } from '@/lib/csrf'
import { logAudit } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/mfa/verify
 * Verify a TOTP code against an active challenge.
 * Body: { factorId: string, challengeId: string, code: string }
 */
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 10, 60000)
    if (limited) return limited

    const csrfErr = await checkCsrf(req)
    if (csrfErr) return csrfErr

    const raw = await readJson<{ factorId: string; challengeId: string; code: string }>(req)
    if (!raw?.factorId || !raw?.challengeId || !raw?.code) {
      return jsonError('factorId, challengeId, and code are required', 400)
    }

    const result = await verifyMfaFactor(req, raw.factorId, raw.challengeId, raw.code)

    await logAudit('system', 'mfa.verify', 'TOTP factor verified')

    return jsonOk(result)
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return jsonError('Authentication required', 401)
    }
    return jsonError(error?.message || 'MFA verification failed', 400)
  }
}

import { NextRequest } from 'next/server'
import { enrollMfaFactor } from '@/lib/mfa'
import { jsonError, jsonOk, applyStandardHeaders } from '@/lib/api-helpers'
import { rateLimit } from '@/lib/security'
import { checkCsrf } from '@/lib/csrf'
import { logAudit } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/mfa/enroll
 * Enroll a new TOTP MFA factor for the authenticated user.
 * Returns QR code URI and recovery codes.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 5, 60000)
    if (limited) return limited

    const csrfErr = await checkCsrf(req)
    if (csrfErr) return csrfErr

    const result = await enrollMfaFactor(req)

    await logAudit('system', 'mfa.enroll', 'TOTP factor enrolled')

    return jsonOk(result)
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return jsonError('Authentication required', 401)
    }
    return jsonError(error?.message || 'MFA enrollment failed', 400)
  }
}

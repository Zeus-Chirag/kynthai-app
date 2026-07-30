import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
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

    // Verify that user is authenticated and get their actual user ID
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll() },
          setAll() {},
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return jsonError('Authentication required', 401)
    }

    const result = await verifyMfaFactor(req, raw.factorId, raw.challengeId, raw.code)

    // Use the actual authenticated user ID
    await logAudit(user.id, 'mfa.verify', 'TOTP factor verified')

    return jsonOk(result)
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return jsonError('Authentication required', 401)
    }
    return jsonError(error?.message || 'MFA verification failed', 400)
  }
}

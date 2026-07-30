import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { unenrollMfaFactor } from '@/lib/mfa'
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers'
import { rateLimit } from '@/lib/security'
import { checkCsrf } from '@/lib/csrf'
import { logAudit } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/mfa/disable
 * Disable (unenroll) an MFA factor.
 * Body: { factorId: string }
 * Requires the user to be authenticated and CSRF protected.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 5, 60000)
    if (limited) return limited

    const csrfErr = await checkCsrf(req)
    if (csrfErr) return csrfErr

    // Get the authenticated user for audit logging
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

    const raw = await readJson<{ factorId: string }>(req)
    if (!raw?.factorId) {
      return jsonError('factorId is required', 400)
    }

    await unenrollMfaFactor(req, raw.factorId)

    await logAudit(user.id, 'mfa.disable', `TOTP factor ${raw.factorId} disabled`)

    return jsonOk({ success: true, message: 'MFA factor disabled successfully' })
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return jsonError('Authentication required', 401)
    }
    return jsonError(error?.message || 'MFA disable failed', 400)
  }
}

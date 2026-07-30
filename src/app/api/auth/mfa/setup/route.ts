import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { enrollMfaFactor } from '@/lib/mfa'
import { jsonError, jsonOk } from '@/lib/api-helpers'
import { rateLimit } from '@/lib/security'
import { checkCsrf } from '@/lib/csrf'
import { logAudit } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/mfa/setup
 * Full MFA setup flow:
 * 1. Enrolls a new TOTP factor
 * 2. Returns QR code + secret + recovery codes
 *
 * The client must then call /api/auth/mfa/verify with a generated TOTP code
 * to confirm the setup was successful.
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

    const result = await enrollMfaFactor(req)

    await logAudit(user.id, 'mfa.setup', 'TOTP factor enrollment initiated')

    return jsonOk(result)
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return jsonError('Authentication required', 401)
    }
    return jsonError(error?.message || 'MFA setup failed', 400)
  }
}

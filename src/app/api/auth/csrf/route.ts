import { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/security'
import { jsonOk } from '@/lib/api-helpers'
import { setCsrfCookie } from '@/lib/csrf'

// GET /api/auth/csrf — generate and set a CSRF token cookie.
// Call this on app load (frontend) and include the returned token
// in the X-CSRF-Token header for all POST/PUT/PATCH/DELETE requests.
export async function GET(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  // HIPAA: audit CSRF token issuance (public endpoint, no user)
  const fwdFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  console.info(JSON.stringify({ level: 'audit', event: 'csrf.token_issued', ip: fwdFor, ts: new Date().toISOString() }))

  const { token } = await setCsrfCookie()
  return jsonOk({ token })
}

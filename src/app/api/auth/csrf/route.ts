import { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/security';
import { jsonOk } from '@/lib/api-helpers';
import { setCsrfCookie } from '@/lib/csrf';
import { logger } from '@/lib/logger';

// Prevent static generation — sets cookies + rate-limits at runtime
export const dynamic = 'force-dynamic';

// GET /api/auth/csrf — generate and set a CSRF token cookie.
// Call this on app load (frontend) and include the returned token
// in the X-CSRF-Token header for all POST/PUT/PATCH/DELETE requests.
export async function GET(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  // Audit: CSRF token issuance (public endpoint, no user)
  const fwdFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  logger.info('csrf.token_issued', JSON.stringify({ ip: fwdFor }));

  const { token } = await setCsrfCookie(req);
  return jsonOk({ token });
}

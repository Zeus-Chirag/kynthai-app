import { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/security'
import { requireAdmin, jsonOk, jsonError } from '@/lib/api-helpers'
import { logAudit } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { runFraudChecks } from '@/lib/fraud-checks'
export const dynamic = 'force-dynamic'

// GET /api/admin/fraud — 7 automated fraud pattern checks (shared engine in
// src/lib/fraud-checks.ts, also used by /api/admin/overview).
export async function GET(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAdmin(req)
  if (response || !user) return response!
  const auser = user!

  await logAudit(auser.id, 'admin.fraud_review')

  try {
    const { summary, flags } = await runFraudChecks()
    return jsonOk({ summary, flags })
  } catch (error) {
    // Security: never log raw DB errors — they may contain sensitive health data
    logger.phiSafeError(error, 'admin.fraud')
    return jsonError('Internal server error', 500)
  }
}

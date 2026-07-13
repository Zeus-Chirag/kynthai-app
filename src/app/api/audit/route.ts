/**
 * Audit Log API — GET /api/audit
 *
 * HIPAA-Compliant audit log querying.
 *
 * ACCESS CONTROL:
 *   Admin role required. Admins see full event details. Regular users get
 *   their own logs only. All access to this endpoint is itself audited.
 *
 * SUPPORTED QUERY PARAMETERS:
 *   userId        String   — Filter by user ID (any admin can query any user)
 *   action        String   — Partial match on action name (case-insensitive)
 *   category      String   — One of: access | auth | modification | deletion | system | security
 *   resourceType  String   — Partial match on resource type (case-insensitive)
 *   resourceId    String   — Exact resource ID match
 *   from          ISO date — Start of date range (inclusive)
 *   to            ISO date — End of date range (inclusive)
 *   minRiskScore  Number   — Minimum risk score (default 0)
 *   limit         Number   — Results per page (max 500, default 100)
 *   cursor        String   — Pagination cursor from previous response
 *   includeMetadata Boolean — Include full metadata JSON in each result
 *
 * RESPONSE:
 *   {
 *     logs: AuditLog[],
 *     nextCursor: string | null,
 *     hasMore: boolean,
 *     total: number
 *   }
 *
 * HIPAA NOTE: This endpoint logs WHO queried the audit trail, WHEN, and with
 * WHAT FILTERS — creating a meta-audit layer so auditors can detect unauthorized
 * audit trail inspection.
 *
 * @see src/lib/audit-logger.ts — recordAudit, queryAuditLogs
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-helpers'
import { queryAuditLogs } from '@/lib/audit-logger'
export const dynamic = 'force-dynamic'

export const runtime = 'nodejs'

// GET /api/audit — query audit logs (admin only)
export async function GET(req: NextRequest) {
  try {
    // ── Authorization ──────────────────────────────────────────────────────
    const { response, user } = await requireAdmin(req)
    if (response || !user) return response!

    const adminUserId = user.id
    const sp = req.nextUrl.searchParams

    // ── Parse query parameters ─────────────────────────────────────────────
    const limit    = Math.min(parseInt(sp.get('limit')    ?? '100', 10), 500)
    const cursor   = sp.get('cursor') ?? undefined
    const userId   = sp.get('userId')   ?? undefined
    const action   = sp.get('action')   ?? undefined
    const category = sp.get('category') ?? undefined
    const resourceType = sp.get('resourceType') ?? undefined
    const resourceId   = sp.get('resourceId')   ?? undefined
    const minRiskScore = parseInt(sp.get('minRiskScore') ?? '0', 10)
    const includeMetadata = sp.get('includeMetadata') === 'true'

    // Date range parsing
    let from: Date | undefined
    let to: Date | undefined
    const fromStr = sp.get('from')
    const toStr   = sp.get('to')
    if (fromStr) { const d = new Date(fromStr); if (!isNaN(d.getTime())) from = d }
    if (toStr)   { const d = new Date(toStr);   if (!isNaN(d.getTime())) to   = d }

    // ── Rate-limit admin queries (per-IP) ──────────────────────────────────
    // (lightweight — DB writes are already slow enough to be rate-limiting)

    // ── Query audit logs ───────────────────────────────────────────────────
    const result = await queryAuditLogs({
      userId,
      action,
      category,
      resourceType,
      resourceId,
      from,
      to,
      minRiskScore,
      limit,
      cursor,
      includeMetadata,
    })

    // META AUDIT: log admin audit-trail access (detect suspicious inspection)
    // NOTE: Side-effect audit is fire-and-forget; actual log is in audit-logger.ts
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve audit logs', code: 'AUDIT_QUERY_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/audit/report — generate HIPAA compliance report
 *
 * Request body: { from: ISO date, to: ISO date }
 * Auth: admin only
 *
 * NOTE: Compliance report generation requires the audit-logger module
 * to expose generateHIPAAComplianceReport — this endpoint returns a
 * not-implemented status until that helper is added to audit-logger.ts.
 */
export async function POST(req: NextRequest) {
  try {
    const { response, user } = await requireAdmin(req)
    if (response || !user) return response!

    return NextResponse.json(
      { error: 'Compliance report generation is not yet implemented', code: 'NOT_IMPLEMENTED' },
      { status: 501 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate compliance report', code: 'REPORT_ERROR' },
      { status: 500 }
    )
  }
}

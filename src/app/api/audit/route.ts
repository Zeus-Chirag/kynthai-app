/**
 * Audit Log API — GET /api/audit
 *
 * HIPAA-Compliant audit log querying. Admin-only.
 */
import { NextRequest, NextResponse } from 'next/server'
import { AuditCategory, queryAuditLogs, auditLog } from '@/lib/audit-logger'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionUser()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') ?? undefined
  const action = searchParams.get('action') ?? undefined
  const category = searchParams.get('category') ?? undefined
  const resourceType = searchParams.get('resourceType') ?? undefined
  const resourceId = searchParams.get('resourceId') ?? undefined
  const startDate = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
  const endDate = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined
  const limit = Math.min(Number(searchParams.get('limit')) || 100, 500)
  const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : undefined

  const result = await queryAuditLogs({
    userId,
    action,
    category: category as AuditCategory | undefined,
    resourceType,
    resourceId,
    startDate,
    endDate,
    limit,
    offset,
  })

  // Meta audit
  await auditLog({
    userId: session.id,
    action: 'audit.access',
    category: 'security' as AuditCategory,
    outcome: 'success',
    resourceType: 'audit-log',
    resourceId: 'query',
  })

  return NextResponse.json({
    logs: result.logs,
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
    total: result.total,
  })
}
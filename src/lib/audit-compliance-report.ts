/**
 * HIPAA Audit Compliance Report Generator
 *
 * Generates compliant audit trail reports for:
 *  - PHI access audit (164.312(b) — Audit Controls)
 *  - Authentication events report
 *  - Anomaly detection report
 *  - Data retention / deletion audit
 *  - Full compliance export (JSON + CSV-ready)
 */

import { db } from './db'

import {  queryAuditLogs,
  countAuditEvents,
  AuditCategory,
  type AuditLogQuery,
} from './audit-logger'

export interface ComplianceReportParams {
  /** Report date range */
  from: Date
  to: Date
  /** Optional user filter — omit for full-org report */
  userId?: string
  /** Include full metadata in output */
  includeMetadata?: boolean
}

// ── PHI Access Report (164.312(b)) ────────────────────────────────────────

export async function generatePHIAccessReport({
  from,
  to,
  userId,
  includeMetadata = false,
}: ComplianceReportParams) {
  const logs = await queryAuditLogs({
    userId,
    category: AuditCategory.ACCESS,
    from,
    to,
    limit: 1000,
    includeMetadata,
  })

  return {
    reportType: 'PHI_ACCESS',
    hipaaSection: '164.312(b)',
    generatedAt: new Date().toISOString(),
    dateRange: { from, to },
    summary: {
      totalAccesses: logs.total,
      uniqueUsers: new Set(logs.logs.map(l => l.userId)).size,
      uniqueResourceTypes: new Set(logs.logs.filter(l => l.resourceType).map(l => l.resourceType!)).size,
    },
    entries: logs.logs.map(l => ({
      ...l,
      riskIndicators: ((l.riskScore ?? 0) ?? 0) >= 50 ? ['HIGH_RISK'] : []
    })),
    pagination: { nextCursor: logs.nextCursor, hasMore: logs.hasMore },
  }
}

// ── Authentication Events Report ──────────────────────────────────────────

export async function generateAuthEventsReport({
  from,
  to,
  userId,
  includeMetadata = false,
}: ComplianceReportParams) {
  const logs = await queryAuditLogs({
    userId,
    category: AuditCategory.AUTH,
    from,
    to,
    limit: 1000,
    includeMetadata,
  })

  const failedLogins    = logs.logs.filter(l => l.action.endsWith('.failed_login') || l.outcome === 'failure')
  const successfulLogins = logs.logs.filter(l => l.action.endsWith('.login') && l.outcome === 'success')
  const passwordResets   = logs.logs.filter(l => l.action.includes('password.reset'))
  const lockouts         = logs.logs.filter(l => l.action.includes('lockout'))

  return {
    reportType: 'AUTH_EVENTS',
    hipaaSection: '164.312(a)(1)',
    generatedAt: new Date().toISOString(),
    dateRange: { from, to },
    summary: {
      totalAuthEvents: logs.total,
      successfulLogins: successfulLogins.length,
      failedLogins:    failedLogins.length,
      passwordResets:  passwordResets.length,
      lockoutEvents:   lockouts.length,
    },
    suspiciousEvents: logs.logs.filter(l => ((l.riskScore ?? 0) ?? 0) >= 50),
    entries: logs.logs,
    pagination: { nextCursor: logs.nextCursor, hasMore: logs.hasMore },
  }
}

// ── Anomaly Detection Report ──────────────────────────────────────────────

export async function generateAnomalyReport({
  from,
  to,
  includeMetadata = true,
}: ComplianceReportParams) {
  const logs = await queryAuditLogs({
    category: AuditCategory.SECURITY,
    from,
    to,
    limit: 500,
    includeMetadata: true, // always include for security
  })

  const byAction = new Map<string, number>()
  const byUser  = new Map<string, number>()
  for (const l of logs.logs) {
    byAction.set(l.action, (byAction.get(l.action) ?? 0) + 1)
    byUser.set(l.userId,  (byUser.get(l.userId)  ?? 0) + 1)
  }

  return {
    reportType: 'ANOMALY_DETECTION',
    hipaaSection: '164.312(b)',
    generatedAt: new Date().toISOString(),
    dateRange: { from, to },
    summary: {
      totalSecurityEvents: logs.total,
      uniqueUsersFlagged: byUser.size,
      highRiskEvents: logs.logs.filter(l => ((l.riskScore ?? 0) ?? 0) >= 70).length,
    },
    topActions: [...byAction.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
    topUsers:   [...byUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
    criticalEntries: logs.logs.filter(l => ((l.riskScore ?? 0) ?? 0) >= 70),
    entries: logs.logs,
  }
}

// ── Data Modifications Report ─────────────────────────────────────────────

export async function generateModificationReport({
  from,
  to,
  userId,
  includeMetadata = true,
}: ComplianceReportParams) {
  const logs = await queryAuditLogs({
    userId,
    category: AuditCategory.MODIFY,
    from,
    to,
    limit: 1000,
    includeMetadata,
  })

  const byResourceType = new Map<string | undefined, number>()
  for (const l of logs.logs) {
    const rt = l.resourceType ?? 'unknown'
    byResourceType.set(rt, (byResourceType.get(rt) ?? 0) + 1)
  }

  return {
    reportType: 'DATA_MODIFICATIONS',
    hipaaSection: '164.312(a)(2)(i)',
    generatedAt: new Date().toISOString(),
    dateRange: { from, to },
    summary: {
      totalModifications: logs.total,
      resourceTypesAffected: byResourceType.size,
    },
    byResourceType: Object.fromEntries(byResourceType),
    entries: logs.logs,
    pagination: { nextCursor: logs.nextCursor, hasMore: logs.hasMore },
  }
}

// ── Full Compliance Export ────────────────────────────────────────────────

export async function generateFullComplianceReport({
  from,
  to,
  userId,
}: {
  from: Date
  to: Date
  userId?: string
}) {
  const [phiAccess, authEvents, anomalies, modifications] = await Promise.all([
    generatePHIAccessReport({ from, to, userId }),
    generateAuthEventsReport({ from, to, userId }),
    generateAnomalyReport({ from, to }),
    generateModificationReport({ from, to, userId }),
  ])

  // Overall risk scoring
  const totalRiskScore = await countAuditEvents({
    userId,
    from,
    to,
  }).then(async () => {
    // Rough summary
    const securityEvents = await countAuditEvents({ userId, category: AuditCategory.SECURITY, from, to })
    const failedAuth     = await countAuditEvents({ userId, action: 'auth.failed_login', from, to })
    const deletions      = await countAuditEvents({ userId, category: AuditCategory.DELETE, from, to })
    return {
      securityEvents,
      failedAuthEvents: failedAuth,
      deletionEvents:   deletions,
      riskLevel: (securityEvents + failedAuth * 2) > 10 ? 'HIGH'
                  : (securityEvents + failedAuth) > 3 ? 'MEDIUM'
                  : 'LOW',
    }
  }).catch(() => ({ riskLevel: 'UNKNOWN' } as Record<string, unknown>))

  return {
    reportType: 'FULL_COMPLIANCE',
    generatedAt: new Date().toISOString(),
    dateRange: { from, to },
    overallRisk: totalRiskScore,
    sections: {
      phiAccess,
      authEvents,
      anomalies,
      modifications,
    },
    notes: [
      'HIPAA Section 164.312(b) requires audit controls for PHI access.',
      'All PHI access events are logged with user, resource, timestamp, IP, and outcome.',
      'RetentionPolicy: Audit logs retained for minimum 6 years per 45 CFR §164.530(j)(2).',
      'Log integrity is protected via database constraints (CASCADE on user deletion).',
      'IP addresses are stored encrypted (AES-256-GCM) per field-encryption middleware.',
    ],
  }
}

// ── CSV Export Helper ──────────────────────────────────────────────────────

export function auditLogsToCSV(logs: Array<{
  id: string
  userId: string
  action: string
  category: string
  resourceType?: string
  resourceId?: string
  httpMethod?: string
  httpPath?: string
  statusCode?: number
  outcome?: string
  riskScore?: number
  details?: string
  createdAt: Date
}>): string {
  const header = [
    'timestamp', 'user_id', 'action', 'category', 'resource_type', 'resource_id',
    'http_method', 'http_path', 'status_code', 'outcome', 'risk_score', 'details',
  ].join(',')

  const rows = logs.map(l =>
    [
      l.createdAt.toISOString(),
      l.userId,
      `"${(l.action ?? '').replace(/"/g, '""')}"`,
      l.category,
      l.resourceType ?? '',
      l.resourceId ?? '',
      l.httpMethod ?? '',
      `"${(l.httpPath ?? '').replace(/"/g, '""')}"`,
      l.statusCode ?? '',
      l.outcome ?? '',
      l.riskScore ?? 0,
      `"${(l.details ?? '').replace(/"/g, '""').slice(0, 200)}"`,
    ].join(',')
  )

  return [header, ...rows].join('\n')
}

// ── Retention-Aware Purge ─────────────────────────────────────────────────
/**
 * Purge audit logs older than the retention period (HIPAA: 6 years).
 *
 * WARNING: Destructive operation. Should only be called by an automated
 * retention job with proper authorization.
 */
export async function purgeExpiredAuditLogs(retentionYears = 6): Promise<number> {
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - retentionYears)

  // Count first
  const count = await db.auditLog.count({
    where: { createdAt: { lt: cutoff }, deletedAt: null },
  })

  if (count === 0) return 0

  // Soft-delete (keep for additional legal hold if needed)
  await db.auditLog.updateMany({
    where: { createdAt: { lt: cutoff }, deletedAt: null },
    data: { deletedAt: new Date() },
  })

  return count
}


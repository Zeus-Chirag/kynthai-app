/**
 * Health Data Protection Compliance Report Generator for Kynthai
 *
 * Generates structured compliance reports under Health Data Protection:
 *   - 164.312(b) — Audit Controls (sensitive health data access, anomaly detection)
 *   - 164.312(a)(1) — Authentication Events
 *   - 164.312(a)(2)(i) — Data Modifications
 *   - Full compliance export (JSON + CSV-ready)
 */

import { db } from '@/lib/db'

import {
  queryAuditLogs,
  countAuditEvents,
  AuditCategory,
} from '@/lib/audit-logger'

export interface ComplianceReportParams {
  startDate: Date
  endDate: Date
  userId?: string
}

// ── Sensitive Health Data Access Report ─────────────────────────────────────────

export async function generateSensitiveHealthDataAccessReport({
  startDate,
  endDate,
  userId,
}: ComplianceReportParams) {
  const logs = await queryAuditLogs({
    userId,
    category: AuditCategory.ACCESS,
    startDate,
    endDate,
    limit: 1000,
  })

  const uniqueUsers = new Set<string>()
  const uniqueResources = new Set<string>()
  for (const l of logs.logs) {
    if (l.userId) uniqueUsers.add(l.userId)
    if (l.resourceType) uniqueResources.add(l.resourceType)
  }

  return {
    reportType: 'sensitive health data_ACCESS',
    hipaaSection: '164.312(b)',
    generatedAt: new Date().toISOString(),
    dateRange: { startDate, endDate },
    summary: {
      totalAccesses: logs.total,
      uniqueUsers: uniqueUsers.size,
      uniqueResources: uniqueResources.size,
    },
    entries: logs.logs,
    pagination: { nextCursor: logs.nextCursor, hasMore: logs.hasMore },
  }
}

// ── Authentication Events Report ──────────────────────────────────────────

export async function generateAuthEventsReport({
  startDate,
  endDate,
  userId,
}: ComplianceReportParams) {
  const logs = await queryAuditLogs({
    userId,
    category: AuditCategory.AUTH,
    startDate,
    endDate,
    limit: 1000,
  })

  let successfulLogins = 0
  let failedLogins = 0
  const uniqueUsers = new Set<string>()
  for (const l of logs.logs) {
    if (l.userId) uniqueUsers.add(l.userId)
    if (l.outcome === 'success') successfulLogins++
    if (l.outcome === 'failure') failedLogins++
  }

  return {
    reportType: 'AUTH_EVENTS',
    hipaaSection: '164.312(a)(1)',
    generatedAt: new Date().toISOString(),
    dateRange: { startDate, endDate },
    summary: {
      totalAuthEvents: logs.total,
      successfulLogins,
      failedLogins,
      uniqueUsers: uniqueUsers.size,
    },
    entries: logs.logs,
    pagination: { nextCursor: logs.nextCursor, hasMore: logs.hasMore },
  }
}

// ── Anomaly Detection Report ──────────────────────────────────────────────

export async function generateAnomalyReport({
  startDate,
  endDate,
}: ComplianceReportParams) {
  const logs = await queryAuditLogs({
    category: AuditCategory.SECURITY,
    startDate,
    endDate,
    limit: 500,
  })

  let highRiskEvents = 0
  const byUser = new Map<string, number>()
  for (const l of logs.logs) {
    if (l.userId) byUser.set(l.userId, (byUser.get(l.userId) ?? 0) + 1)
    if ((l.riskScore ?? 0) >= 50) highRiskEvents++
  }

  return {
    reportType: 'ANOMALY_DETECTION',
    hipaaSection: '164.312(b)',
    generatedAt: new Date().toISOString(),
    dateRange: { startDate, endDate },
    summary: {
      totalSecurityEvents: logs.total,
      uniqueUsersFlagged: byUser.size,
      highRiskEvents,
    },
    entries: logs.logs,
    pagination: { nextCursor: logs.nextCursor, hasMore: logs.hasMore },
  }
}

// ── Data Modifications Report ─────────────────────────────────────────────

export async function generateModificationReport({
  startDate,
  endDate,
  userId,
}: ComplianceReportParams) {
  const logs = await queryAuditLogs({
    userId,
    category: AuditCategory.MODIFY,
    startDate,
    endDate,
    limit: 1000,
  })

  const byResourceType = new Map<string, number>()
  for (const l of logs.logs) {
    const rt = l.resourceType ?? 'unknown'
    byResourceType.set(rt, (byResourceType.get(rt) ?? 0) + 1)
  }

  return {
    reportType: 'DATA_MODIFICATIONS',
    hipaaSection: '164.312(a)(2)(i)',
    generatedAt: new Date().toISOString(),
    dateRange: { startDate, endDate },
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
  startDate,
  endDate,
  userId,
}: {
  startDate: Date
  endDate: Date
  userId?: string
}) {
  const [authEvents, anomalies, modifications, phiAccess] = await Promise.all([
    generateAuthEventsReport({ startDate, endDate, userId }),
    generateAnomalyReport({ startDate, endDate }),
    generateModificationReport({ startDate, endDate, userId }),
    generateSensitiveHealthDataAccessReport({ startDate, endDate, userId }),
  ])

  const totalRiskScore = await countAuditEvents({
    userId,
    startDate,
    endDate,
  }).then(async () => {
    const securityEvents = await countAuditEvents({ userId, category: AuditCategory.SECURITY, startDate, endDate })
    const failedAuth     = await countAuditEvents({ userId, action: 'auth.failed_login', startDate, endDate })
    const deletions      = await countAuditEvents({ userId, category: AuditCategory.DELETE, startDate, endDate })
    return {
      securityEvents,
      failedAuthEvents: failedAuth,
      dataDeletions: deletions,
      overall: Math.min(
        (securityEvents * 10) + (failedAuth * 5) + (deletions * 15),
        100
      ),
    }
  })

  return {
    reportType: 'FULL_COMPLIANCE',
    generatedAt: new Date().toISOString(),
    dateRange: { startDate, endDate },
    overallRisk: totalRiskScore,
    sections: {
      phiAccess,
      authEvents,
      anomalies,
      modifications,
    },
  }
}

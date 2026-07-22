/**
 * Audit Logging System for Kyntha
 */

import { db } from '@/lib/db'

export const AUDIT_LOG_SYNC = process.env.AUDIT_LOG_SYNC === 'true'
export const MAX_METADATA_LENGTH = 4096

export const AuditCategory = {
  ACCESS:   'access',
  AUTH:     'auth',
  MODIFY:   'modification',
  DELETE:   'deletion',
  SYSTEM:   'system',
  SECURITY: 'security',
  CONSENT:  'consent',
} as const

export type AuditCategory = (typeof AuditCategory)[keyof typeof AuditCategory]

export interface AuditContext {
  userId?: string
  action?: string
  category?: AuditCategory
  resourceType?: string
  resourceId?: string
  httpMethod?: string
  httpPath?: string
  statusCode?: number
  userAgent?: string
  ip?: string
  metadata?: Record<string, unknown>
  outcome?: 'success' | 'failure' | 'forbidden' | 'error'
}

export interface AuditLogQuery {
  userId?: string
  action?: string
  category?: AuditCategory
  resourceType?: string
  resourceId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────

export const PHI_RESOURCES: Record<string, { sensitivity: 'high' | 'medium' | 'low' }> = {
  User: { sensitivity: 'high' },
  Medication: { sensitivity: 'high' },
  LabResult: { sensitivity: 'high' },
  Prescription: { sensitivity: 'high' },
  ConsultationNote: { sensitivity: 'high' },
  HealthScore: { sensitivity: 'medium' },
  HealthJournal: { sensitivity: 'high' },
  LabBooking: { sensitivity: 'high' },
  Appointment: { sensitivity: 'medium' },
  ChronicCondition: { sensitivity: 'high' },
  EmergencyAlert: { sensitivity: 'high' },
  Payment: { sensitivity: 'high' },
  DoctorProfile: { sensitivity: 'medium' },
  LabProfile: { sensitivity: 'medium' },
  Family: { sensitivity: 'medium' },
  FamilyMember: { sensitivity: 'high' },
  ChatMessage: { sensitivity: 'medium' },
  PrescriptionIntelligence: { sensitivity: 'high' },
}

function isOutsideBusinessHours(): boolean {
  const h = new Date().getUTCHours()
  return h < 7 || h > 21
}

function computeRiskScore(ctx: AuditContext): number {
  let score = 0
  if (ctx.outcome === 'failure' || ctx.outcome === 'forbidden') score += 40
  if (ctx.outcome === 'error' && ctx.resourceType) score += 30
  if (ctx.statusCode === 429) score += 25
  if (isOutsideBusinessHours() && ctx.outcome === 'success') score += 15
  return Math.min(score, 100)
}

function sanitizeMetadata(raw?: Record<string, unknown>): string | undefined {
  if (!raw || Object.keys(raw).length === 0) return undefined
  try {
    const clean = JSON.parse(JSON.stringify(raw))
    for (const k of ['password', 'token', 'secret', 'authorization', 'cookie', 'session', 'csrf', 'jwt']) {
      if (k in clean) delete clean[k]
    }
    const s = JSON.stringify(clean)
    return s.length > MAX_METADATA_LENGTH ? JSON.stringify({ _truncated: true }) : s
  } catch { return undefined }
}

function maskId(id: string): string {
  return id.length > 8 ? id.slice(0, 4) + '***' + id.slice(-4) : id
}

function buildAuditDescription(userId: string | null, action: string, ctx: AuditContext): string {
  const parts = [`user=${userId ?? 'anonym'}`, `action=${action}`, `method=${ctx.httpMethod ?? '?'}`]
  if (ctx.resourceType) parts.push(`res=${ctx.resourceType}`)
  if (ctx.resourceId) parts.push(`id=${maskId(ctx.resourceId)}`)
  if (ctx.statusCode) parts.push(`st=${ctx.statusCode}`)
  if (ctx.outcome) parts.push(`out=${ctx.outcome}`)
  return parts.join(' | ')
}

function categorizeAction(action: string): AuditCategory {
  if (action.startsWith('auth.')) return 'auth' as AuditCategory
  if (action.startsWith('security.')) return 'security' as AuditCategory
  if (action.startsWith('consent.')) return 'consent' as AuditCategory
  if (action.includes('.delete') || action.includes('.purge')) return 'deletion' as AuditCategory
  if (action.includes('.create') || action.includes('.update')) return 'modification' as AuditCategory
  return 'access' as AuditCategory
}

// ─── Queue ────────────────────────────────────────────────────────────────

const auditQueue: Array<{
  userId: string | null
  action: string
  ctx: AuditContext
  resolve: (v: { ok: boolean }) => void
  reject: (e: unknown) => void
}> = []

let flushTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFlush(): void {
  if (flushTimer) return
  flushTimer = setTimeout(async () => {
    flushTimer = null
    if (auditQueue.length === 0) return
    const batch = auditQueue.splice(0, 50)
    try {
      await db.auditLog.createMany({
        data: batch.map(({ userId, action, ctx }) => ({
          userId,
          action,
          category: ctx.category ?? categorizeAction(action),
          details: buildAuditDescription(null, action, ctx),
          httpMethod: ctx.httpMethod?.slice(0, 10) ?? null,
          httpPath: ctx.httpPath ?? null,
          statusCode: ctx.statusCode ?? null,
          userAgent: ctx.userAgent?.slice(0, 512) ?? null,
          ip: ctx.ip ?? null,
          resourceType: ctx.resourceType ?? null,
          resourceId: ctx.resourceId ?? null,
          outcome: ctx.outcome ?? 'success',
          riskScore: computeRiskScore(ctx),
          metadata: sanitizeMetadata(ctx.metadata) ?? '{}',
        })),
      })
      batch.forEach(e => e.resolve({ ok: true }))
    } catch (err) {
      console.error('[audit] batch err:', err)
      batch.forEach(e => e.reject(err))
    }
  }, 500)
}

// ─── Core Logging ─────────────────────────────────────────────────────────

export async function recordAudit(
  userId: string | null, action: string, ctx: AuditContext = {}
): Promise<{ ok: boolean }> {
  return new Promise<{ ok: boolean }>(resolve => {
    auditQueue.push({ userId, action, ctx, resolve, reject: resolve as (e: unknown) => void })
    scheduleFlush()
  })
}

export async function recordAuditSync(
  userId: string | null, action: string, ctx: AuditContext = {}
): Promise<{ ok: boolean }> {
  const category = ctx.category ?? categorizeAction(action)
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        category,
        details: buildAuditDescription(userId, action, ctx),
        httpMethod: ctx.httpMethod?.slice(0, 10) ?? null,
        httpPath: ctx.httpPath ?? null,
        statusCode: ctx.statusCode ?? null,
        userAgent: ctx.userAgent?.slice(0, 512) ?? null,
        ip: ctx.ip ?? null,
        resourceType: ctx.resourceType ?? null,
        resourceId: ctx.resourceId ?? null,
        outcome: ctx.outcome ?? 'success',
        riskScore: computeRiskScore(ctx),
        metadata: sanitizeMetadata(ctx.metadata) ?? '{}',
      },
    })
    return { ok: true }
  } catch (err) {
    console.error('[audit] sync err:', err)
    return { ok: false }
  }
}

// ─── Convenience ──────────────────────────────────────────────────────────

export async function logAuthEvent(userId: string, subAction: string, ctx: Omit<AuditContext, 'category'> = {}): Promise<{ ok: boolean }> {
  return recordAuditSync(userId, `auth.${subAction}`, { ...ctx, category: 'auth' as AuditCategory })
}

export async function logPHIAccess(userId: string, resourceType: string, resourceId: string, action = 'record.access', ctx: Omit<AuditContext, 'resourceType' | 'resourceId'> = {}): Promise<{ ok: boolean }> {
  return recordAudit(userId, action, { ...ctx, resourceType, resourceId, category: 'access' as AuditCategory })
}

export async function logPHIModification(userId: string, resourceType: string, resourceId: string, action: string, ctx: Omit<AuditContext, 'resourceType' | 'resourceId' | 'category'> = {}): Promise<{ ok: boolean }> {
  return recordAuditSync(userId, action, { ...ctx, resourceType, resourceId, category: 'modification' as AuditCategory })
}

export async function logSecurityEvent(userId: string | undefined, action: string, ctx: AuditContext = {}): Promise<{ ok: boolean }> {
  return recordAuditSync(userId ?? 'system', action, { ...ctx, category: 'security' as AuditCategory, outcome: ctx.outcome ?? 'failure' })
}

export async function logAdminAction(adminId: string, action: string, ctx: AuditContext = {}): Promise<{ ok: boolean }> {
  return recordAuditSync(adminId, action, { ...ctx, category: 'system' as AuditCategory, outcome: 'success' })
}

export async function auditLog(ctx: AuditContext): Promise<{ ok: boolean }> {
  return recordAuditSync(ctx.userId ?? 'anonym', ctx.action ?? 'unknown', {
    ...ctx,
    category: ctx.category ?? ('system' as AuditCategory),
    outcome: ctx.outcome ?? 'success',
  })
}

// ─── Queries ──────────────────────────────────────────────────────────────

export async function queryAuditLogs(query: AuditLogQuery): Promise<{ logs: any[]; nextCursor: string | null; hasMore: boolean; total: number }> {
  const where: Record<string, unknown> = {}
  if (query.userId) where.userId = query.userId
  if (query.action) where.action = { contains: query.action }
  if (query.category) where.category = query.category
  if (query.resourceType) where.resourceType = query.resourceType
  if (query.resourceId) where.resourceId = query.resourceId
  if (query.startDate || query.endDate) {
    const c: Record<string, unknown> = {}
    if (query.startDate) c.gte = query.startDate
    if (query.endDate) c.lte = query.endDate
    where.createdAt = c
  }
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: query.limit ?? 100, skip: query.offset ?? 0 }),
    db.auditLog.count({ where }),
  ])
  const hasMore = (query.offset ?? 0) + logs.length < total
  const nextCursor = hasMore ? Buffer.from(`${query.offset ?? 0 + (query.limit ?? 100)}`).toString('base64') : null
  return { logs, nextCursor, hasMore, total }
}

export async function countAuditEvents(query: Omit<AuditLogQuery, 'limit' | 'offset'>): Promise<number> {
  const where: Record<string, unknown> = {}
  if (query.userId) where.userId = query.userId
  if (query.action) where.action = { contains: query.action }
  if (query.category) where.category = query.category
  if (query.resourceType) where.resourceType = query.resourceType
  if (query.resourceId) where.resourceId = query.resourceId
  if (query.startDate || query.endDate) {
    const c: Record<string, unknown> = {}
    if (query.startDate) c.gte = query.startDate
    if (query.endDate) c.lte = query.endDate
    where.createdAt = c
  }
  return db.auditLog.count({ where })
}
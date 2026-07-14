/**
 * HIPAA-Compliant Audit Logging System for Kyntha
 * All PHI access is logged with user, resource, IP, user agent, and outcome.
 *
 * Action taxonomy:
 *   auth.{login,logout,failed_login,password_reset,password_changed,lockout}
 *   {resource}.{create,read,update,delete,list,export}
 *   consent.{accepted,revoked,exported}
 *   session.{created,refreshed,terminated}
 *   admin.{user_accessed,fraud_review,retention_run,data_purge}
 *   security.{brute_force_detected,anomaly_detected,rate_limit_exceeded,suspicious_ip}
 */

import { db } from '@/lib/db'

// ── HIPAA Audit Log Configuration ─────────────────────────────────────────
export const AUDIT_LOG_SYNC = process.env.AUDIT_LOG_SYNC === 'true'
export const MAX_METADATA_LENGTH = 4096

// ── Audit Category Enum ───────────────────────────────────────────────────
export const AuditCategory = {
  ACCESS:   'access',
  AUTH:     'auth',
  MODIFY:   'modification',
  DELETE:   'deletion',
  SYSTEM:   'system',
  SECURITY: 'security',
  CONSENT:  'consent',
} as const

export type AuditCategory = typeof AuditCategory[keyof typeof AuditCategory]

// ── PHI Resource Sensitivity Map ──────────────────────────────────────────
export const PHI_RESOURCES: Record<string, { sensitivity: 'high' | 'medium' | 'low' }> = {
  User:             { sensitivity: 'high' },
  Medication:       { sensitivity: 'high' },
  LabResult:        { sensitivity: 'high' },
  Prescription:     { sensitivity: 'high' },
  ConsultationNote: { sensitivity: 'high' },
  HealthScore:      { sensitivity: 'medium' },
  HealthJournal:    { sensitivity: 'high' },
  LabBooking:       { sensitivity: 'high' },
  Appointment:      { sensitivity: 'medium' },
  ChronicCondition: { sensitivity: 'high' },
  EmergencyAlert:   { sensitivity: 'high' },
  Payment:          { sensitivity: 'high' },
  DoctorProfile:    { sensitivity: 'medium' },
  LabProfile:       { sensitivity: 'medium' },
  Family:           { sensitivity: 'medium' },
  FamilyMember:     { sensitivity: 'high' },
  ChatMessage:      { sensitivity: 'medium' },
  PrescriptionIntelligence: { sensitivity: 'high' },
}

// ── Audit Context Interface ───────────────────────────────────────────────
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

// ── Risk Detection ───────────────────────────────────────────────────────
function computeRiskScore(ctx: AuditContext): number {
  let score = 0
  if (ctx.outcome === 'failure' || ctx.outcome === 'forbidden') score += 40
  if (ctx.outcome === 'error'     && isPHIResource(ctx.resourceType)) score += 30
  if (ctx.statusCode === 429) score += 25
  if (isOutsideBusinessHours() && ctx.outcome === 'success')        score += 15
  return Math.min(score, 100)
}

function isOutsideBusinessHours(): boolean {
  const h = new Date().getUTCHours()
  return h < 7 || h > 21
}

function isPHIResource(type?: string): boolean {
  if (!type) return false
  return Object.keys(PHI_RESOURCES).some(
    k => type.toLowerCase().includes(k.toLowerCase())
  )
}

function sanitizeMetadata(raw?: Record<string, unknown>): string | undefined {
  if (!raw || Object.keys(raw).length === 0) return undefined
  try {
    const clean = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>
    const forbidden = ['password', 'token', 'secret', 'authorization', 'cookie', 'session', 'csrf', 'jwt']
    for (const k of forbidden) { if (k in clean) delete (clean as Record<string, unknown>)[k] }
    const serialized = JSON.stringify(clean)
    return serialized.length > MAX_METADATA_LENGTH
      ? JSON.stringify({ _truncated: true })
      : serialized
  } catch { return undefined }
}

function buildAuditDescription(userId: string | null, action: string, ctx: AuditContext): string {
  const parts: string[] = [`user=${userId ?? 'anonymous'}`, `action=${action}`, `method=${ctx.httpMethod ?? 'UNKNOWN'}`]
  if (ctx.resourceType) parts.push(`resource_type=${ctx.resourceType}`)
  if (ctx.resourceId)   parts.push(`resource_id=${maskId(ctx.resourceId)}`)
  if (ctx.statusCode)   parts.push(`status=${ctx.statusCode}`)
  if (ctx.outcome)      parts.push(`outcome=${ctx.outcome}`)
  return parts.join(' | ')
}

function maskId(id: string): string {
  return id.length > 8 ? id.slice(0, 4) + '***' + id.slice(-4) : id
}

// ── Core Auditing Functions ──────────────────────────────────────────────
/**
 * FIRE-AND-FORGET audit log entry. Does not block the response.
 * Use for high-volume, non-critical events.
 */
export async function recordAudit(
  userId: string | null,
  action: string,
  ctx: AuditContext = {}
): Promise<{ ok: boolean }> {
  const category   = ctx.category  ?? categorizeAction(action)
  const riskScore  = computeRiskScore(ctx)
  const metaStr    = sanitizeMetadata(ctx.metadata)

  const data: Record<string, unknown> = {
    userId,
    action,
    category,
    details:    buildAuditDescription(userId, action, ctx),
    httpMethod: ctx.httpMethod?.slice(0, 10) ?? null,
    httpPath:   ctx.httpPath   ?? null,
    statusCode: ctx.statusCode ?? null,
    userAgent:  ctx.userAgent  ? ctx.userAgent.slice(0, 512) : null,
    ip:         ctx.ip         ?? null,
    resourceType: ctx.resourceType ?? null,
    resourceId:   ctx.resourceId   ?? null,
    outcome:    ctx.outcome  ?? 'success',
    riskScore,
    metadata:   metaStr ?? '{}',
  }

  try {
    // Fire-and-forget: don't await to avoid blocking the hot path
    void db.auditLog.create({ data: data as any }).then(
      () => { /* logged */ },
      (err: unknown) => { console.error('[audit] write failed:', err) }
    )
    return { ok: true }
  } catch (err) {
    console.error('[audit] recordAudit error:', err)
    return { ok: false }
  }
}

/**
 * SYNCHRONOUS / AWAITED audit log entry. Use for CRITICAL events
 * (login, logout, password change) where you need confirmed write.
 */
export async function recordAuditSync(
  userId: string | null,
  action: string,
  ctx: AuditContext = {}
): Promise<{ ok: boolean; logId?: string }> {
  const category   = ctx.category  ?? categorizeAction(action)
  const riskScore  = computeRiskScore(ctx)
  const metaStr    = sanitizeMetadata(ctx.metadata)

  const data: Record<string, unknown> = {
    userId,
    action,
    category,
    details:    buildAuditDescription(userId, action, ctx),
    httpMethod: ctx.httpMethod?.slice(0, 10) ?? null,
    httpPath:   ctx.httpPath   ?? null,
    statusCode: ctx.statusCode ?? null,
    userAgent:  ctx.userAgent  ? ctx.userAgent.slice(0, 512) : null,
    ip:         ctx.ip         ?? null,
    resourceType: ctx.resourceType ?? null,
    resourceId:   ctx.resourceId   ?? null,
    outcome:    ctx.outcome  ?? 'success',
    riskScore,
    metadata:   metaStr ?? '{}',
  }

  try {
    const entry = await db.auditLog.create({ data: data as any })
    return { ok: true, logId: entry.id }
  } catch (err) {
    console.error('[audit] recordAuditSync error:', err)
    return { ok: false }
  }
}

function categorizeAction(action: string): AuditCategory {
  if (action.startsWith('auth.'))       return AuditCategory.AUTH
  if (action.startsWith('security.'))   return AuditCategory.SECURITY
  if (action.startsWith('consent.'))    return AuditCategory.CONSENT
  if (action.startsWith('session.'))    return AuditCategory.SYSTEM
  if (action.includes('.delete') || action.includes('.purge')) return AuditCategory.DELETE
  if (action.includes('.create') || action.includes('.update')) return AuditCategory.MODIFY
  return AuditCategory.ACCESS
}

// ── Convenience Shortcuts ────────────────────────────────────────────────
export async function logAuthEvent(
  userId: string,
  subAction: string,
  ctx: Omit<AuditContext, 'category'> = {}
): Promise<{ ok: boolean; logId?: string }> {
  return recordAuditSync(userId, `auth.${subAction}`, { ...ctx, category: AuditCategory.AUTH })
}

export async function logPHIAccess(
  userId: string,
  resourceType: string,
  resourceId: string,
  action = 'record.access',
  ctx: Omit<AuditContext, 'resourceType' | 'resourceId'> = {}
): Promise<{ ok: boolean }> {
  return recordAudit(userId, action, { ...ctx, resourceType, resourceId, category: AuditCategory.ACCESS })
}

export async function logPHIModification(
  userId: string,
  resourceType: string,
  resourceId: string,
  action: string,
  ctx: Omit<AuditContext, 'resourceType'|'resourceId'|'category'> = {}
): Promise<{ ok: boolean; logId?: string }> {
  return recordAuditSync(userId, action, { ...ctx, resourceType, resourceId, category: AuditCategory.MODIFY })
}

export async function logSecurityEvent(
  userId: string | undefined,
  action: string,
  ctx: AuditContext = {}
): Promise<{ ok: boolean; logId?: string }> {
  return recordAuditSync(userId ?? 'system', action, { ...ctx, category: AuditCategory.SECURITY, outcome: ctx.outcome ?? 'failure' })
}

export async function logAdminAction(
  adminUserId: string,
  action: string,
  targetUserId: string | undefined,
  ctx: AuditContext = {}
): Promise<{ ok: boolean; logId?: string }> {
  return recordAuditSync(adminUserId, `admin.${action}`, {
    ...ctx,
    category: AuditCategory.SYSTEM,
    metadata: { ...(ctx.metadata ?? {}), targetUserId: targetUserId ?? 'unknown' },
  })
}

// ── Query Functions (for compliance reports) ─────────────────────────────
export interface AuditLogQuery {
  userId?: string
  action?: string
  category?: string
  resourceType?: string
  resourceId?: string
  from?: Date
  to?: Date
  minRiskScore?: number
  limit?: number
  cursor?: string
  includeMetadata?: boolean
}

export async function queryAuditLogs(q: AuditLogQuery) {
  const {
    userId, action, category, resourceType, resourceId,
    from, to, minRiskScore = 0, limit = 100, cursor, includeMetadata = false,
  } = q

  const where: any = {
    ...(userId        ? { userId }                                          : {}),
    ...(category      ? { category }                                        : {}),
    ...(resourceType  ? { resourceType: { contains: resourceType, mode: 'insensitive' } } : {}),
    ...(resourceId    ? { resourceId }                                      : {}),
    ...(from || to     ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(minRiskScore > 0 ? { riskScore: { gte: minRiskScore } } : {}),
  }
  if (action) where.action = { contains: action, mode: 'insensitive' as const }

  const take = Math.min(limit, 500)
  const args: Parameters<typeof db.auditLog.findMany>[0] = {
    where,
    orderBy: { createdAt: 'desc' as const },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor } as any, skipCursor: true as any } : {}),
    select: includeMetadata ? undefined as any : {
      id: true, userId: true, action: true, category: true,
      resourceType: true, resourceId: true, httpMethod: true, httpPath: true,
      statusCode: true, userAgent: true, ip: true, outcome: true, riskScore: true,
      details: true, createdAt: true,
    },
  }
  const entries = await db.auditLog.findMany(args)

  const hasMore  = entries.length > take
  const page     = hasMore ? entries.slice(0, take) : entries
  const nextCur  = hasMore && page.length > 0 ? page[page.length - 1]!.id : null
  const total    = await db.auditLog.count({ where })

  return { logs: page, nextCursor: nextCur, hasMore, total }
}

export async function countAuditEvents(params: {
  userId?: string
  action?: string
  category?: string
  from?: Date
  to?: Date
}): Promise<number> {
  const where: any = {
    ...(params.userId   ? { userId: params.userId }  : {}),
    ...(params.category ? { category: params.category } : {}),
    ...(params.from || params.to ? { createdAt: { ...(params.from ? { gte: params.from } : {}), ...(params.to ? { lte: params.to } : {}) } } : {}),
  }
  if (params.action) where.action = { contains: params.action, mode: 'insensitive' as const }
  return db.auditLog.count({ where })
}

export async function getUserAuditStats(userId: string, from: Date, to: Date) {
  const [total, byCategory, highRisk, failedLogins] = await Promise.all([
    countAuditEvents({ userId, from, to }),
    db.auditLog.groupBy({ by: ['category'], where: { userId, createdAt: { gte: from, lte: to } }, _count: { _all: true } }),
    db.auditLog.count({ where: { userId, createdAt: { gte: from, lte: to }, riskScore: { gte: 50 } } }),
    countAuditEvents({ userId, action: 'auth.failed_login', from, to }),
  ])
  return {
    userId, from, to, total, highRisk, failedLogins,
    byCategory: Object.fromEntries(byCategory.map(c => [c.category, c._count])),
  }
}

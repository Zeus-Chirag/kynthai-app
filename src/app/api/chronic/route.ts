import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { sanitizeText, rateLimit } from '@/lib/security'
import { requireAuth, requireAuthWithCsrf, jsonError, jsonOk, readJson, audit, parseJsonCol, checkConsent } from '@/lib/api-helpers'
export const dynamic = 'force-dynamic'

// GET /api/chronic?patientId=...
export async function GET(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  const u = user!

  const consentErr = checkConsent(u)
  if (consentErr) return consentErr

  const patientId = req.nextUrl.searchParams.get('patientId')?.trim() || u.id
  if (patientId !== u.id && u.role !== 'admin') {
    return jsonError('Forbidden — patientId must match session', 403)
  }

  const conditions = await db.chronicCondition.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return jsonOk(
    conditions.map((c) => ({
      ...c,
      medications: parseJsonCol(c.medications, []),
    })),
  )
}

// POST /api/chronic — add a chronic condition.
export async function POST(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!
  const u = user!

  const body = await readJson<{
    patientId?: string
    name?: string
    diagnosedDate?: string
    severity?: string
    medications?: string[]
    notes?: string
    active?: boolean
  }>(req)
  if (!body) return jsonError('Invalid JSON', 400)

  const patientId = body.patientId || u.id
  if (patientId !== u.id && u.role !== 'admin') {
    return jsonError('You can only add conditions for yourself', 403)
  }

  const name = sanitizeText(body.name, 120)
  if (!name) return jsonError('Condition name is required', 400)

  const cond = await db.chronicCondition.create({
    data: {
      patientId,
      name,
      diagnosedDate: sanitizeText(body.diagnosedDate, 30) || new Date().toISOString().slice(0, 10),
      severity: sanitizeText(body.severity, 30) || 'mild',
      medications: JSON.stringify(Array.isArray(body.medications) ? body.medications : []),
      notes: sanitizeText(body.notes, 1000) || null,
      active: body.active !== false,
    },
  })

  await logAudit(u.id, 'chronic.add', `cond=${cond.id}`)
  return jsonOk({ ...cond, medications: parseJsonCol(cond.medications, []) })
}

// DELETE /api/chronic?id=...
export async function DELETE(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!
  const u = user!

  const id = req.nextUrl.searchParams.get('id')?.trim()
  if (!id) return jsonError('id is required', 400)

  const cond = await db.chronicCondition.findUnique({ where: { id } })
  if (!cond) return jsonError('Condition not found', 404)
  if (cond.patientId !== u.id && u.role !== 'admin') {
    return jsonError('Forbidden', 403)
  }

  await db.chronicCondition.delete({ where: { id } })
  await logAudit(u.id, 'chronic.delete', `cond=${id}`)
  return jsonOk({ success: true })
}

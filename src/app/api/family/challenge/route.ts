import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sanitizeText } from '@/lib/security'
import { requireAuth, jsonError, jsonOk, checkConsent } from '@/lib/api-helpers'
import { logAudit } from '@/lib/auth'
export const dynamic = 'force-dynamic'

// GET /api/family/challenge — list active challenges for the family.
// Authorization: family owner OR caretaker OR admin (verified family member).
export async function GET(req: NextRequest) {
  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  const u = user!

  // SECURITY-CRITICAL: reject non-caretaker / non-owner / non-admin roles
  const FAMILY_ACCESS_ROLES: string[] = ['caretaker', 'owner', 'admin']
  if (!FAMILY_ACCESS_ROLES.includes(u.role)) {
    return jsonError('Forbidden — family management requires the caretaker role', 403)
  }

  await logAudit(user.id, 'family.challenge.read', { resourceType: 'Family' })

  const consentErr = checkConsent(u)
  if (consentErr) return consentErr

  const ownedFamily = await db.family.findFirst({ where: { ownerId: u.id } })
  let targetFamily = ownedFamily
  if (!ownedFamily) {
    const membership = await db.familyMember.findFirst({
      where: { userId: u.id },
      include: { family: true },
    })
    targetFamily = membership?.family ?? null
  }
  if (!targetFamily) return jsonOk([])

  const memberIds = await db.familyMember.findMany({
    where: { familyId: targetFamily.id },
    select: { id: true },
  }).then((ms) => ms.map((m) => m.id))

  const challenges = await db.familyHealthAlert.findMany({
    where: {
      familyId: targetFamily.id,
      OR: [
        { memberId: { in: memberIds } },
        { memberId: { equals: '' } }, // family-wide challenges
      ],
      type: 'challenge',
    },
    orderBy: { createdAt: 'desc' },
  })

  const parsed = challenges.map((c) => ({
    id: c.id,
    familyId: c.familyId,
    memberId: c.memberId,
    title: c.title,
    message: c.message,
    severity: c.severity,
    read: c.read,
    createdAt: c.createdAt.toISOString(),
  }))

  return jsonOk(parsed)
}

// POST /api/family/challenge — create a new family challenge.
export async function POST(req: NextRequest) {
  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  const u = user!

  // SECURITY-CRITICAL: reject non-caretaker / non-owner / non-admin roles
  const FAMILY_ACCESS_ROLES: string[] = ['caretaker', 'owner', 'admin']
  if (!FAMILY_ACCESS_ROLES.includes(u.role)) {
    return jsonError('Forbidden — family management requires the caretaker role', 403)
  }

  const consentErr = checkConsent(u)
  if (consentErr) return consentErr

  const ownedFamily = await db.family.findFirst({ where: { ownerId: u.id } })
  let targetFamily = ownedFamily
  if (!ownedFamily) {
    const membership = await db.familyMember.findFirst({
      where: { userId: u.id },
      include: { family: true },
    })
    targetFamily = membership?.family ?? null
  }
  if (!targetFamily) return jsonError('No family found', 404)

  const body = await req.json().catch(() => null)
  if (!body) return jsonError('Invalid JSON', 400)

  const type = sanitizeText(body.type || 'adherence_streak', 40)
  const title = sanitizeText(body.title, 120)
  const description = sanitizeText(body.description || '', 300)
  const targetDays = Number(body.targetDays) || 7

  const validTypes = ['adherence_streak', 'journal_streak', 'ai_chat_streak']
  if (!validTypes.includes(type)) {
    return jsonError(`Invalid challenge type. Must be one of: ${validTypes.join(', ')}`, 400)
  }
  if (!title) return jsonError('Title is required', 400)
  if (targetDays < 1 || targetDays > 365) return jsonError('Target days must be 1-365', 400)

  const challenge = await db.familyHealthAlert.create({
    data: {
      familyId: targetFamily.id,
      memberId: '', // family-wide challenge
      type: 'challenge',
      title,
      message: `${type} — ${targetDays} days. ${description}`,
      severity: 'info',
      read: false,
    },
  })

  try {
    await db.userBadge.upsert({
      where: { userId_badgeType: { userId: u.id, badgeType: `challenge_created_${type}` } },
      update: {},
      create: { userId: u.id, badgeType: `challenge_created_${type}` },
    })
  } catch {
    // badge might already exist — ignore
  }

  return jsonOk({
    id: challenge.id,
    title: challenge.title,
    message: challenge.message,
    type,
    targetDays,
    createdAt: challenge.createdAt.toISOString(),
  }, 201)
}

import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { getSessionUser } from '@/lib/auth'
import { sanitizeText, rateLimit } from '@/lib/security'
import { checkCsrf } from '@/lib/csrf'
import { jsonError, jsonOk, readJson, audit, parseJsonCol } from '@/lib/api-helpers'
import { labProfileSchema } from '@/lib/schemas'
export const dynamic = 'force-dynamic'

// GET /api/labs — public list of verified labs. Supports ?city=&search=&userId=
export async function GET(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const sp = req.nextUrl.searchParams
  const city = sp.get('city')?.trim()
  const search = sp.get('search')?.trim()
  const userId = sp.get('userId')?.trim()

  if (userId) {
    const session = await getSessionUser()
    if (!session || session.id !== userId) return jsonError('Unauthorized', 401)
    const profile = await db.labProfile.findUnique({ where: { userId }, include: { user: true } })
    if (!profile) return jsonError('Not found', 404)
    return jsonOk({
      id: profile.id,
      userId: profile.userId,
      labName: profile.labName,
      licenseNumber: profile.licenseNumber,
      address: profile.address,
      city: profile.city,
      testsOffered: parseJsonCol(profile.testsOffered, []),
      homeCollection: profile.homeCollection,
      verified: profile.verified,
      verificationStatus: profile.verificationStatus,
      rejectionReason: profile.rejectionReason,
      rating: profile.rating,
      reviewCount: profile.reviewCount,
    })
  }

  const and: Prisma.LabProfileWhereInput[] = [{ verified: true }]
  if (city) and.push({ city: { contains: city } })
  if (search) {
    and.push({
      OR: [
        { labName: { contains: search } },
        { city: { contains: search } },
        { address: { contains: search } },
      ],
    })
  }

  const where: Prisma.LabProfileWhereInput = { AND: and }
  const labs = await db.labProfile.findMany({
    where,
    include: { user: true },
    orderBy: { rating: 'desc' },
    take: 100,
  })

  return jsonOk(
    labs.map((l) => ({
      id: l.id,
      userId: l.userId,
      labName: l.labName,
      city: l.city,
      address: l.address,
      testsOffered: parseJsonCol(l.testsOffered, []),
      homeCollection: l.homeCollection,
      rating: l.rating,
      reviewCount: l.reviewCount,
    })),
  )
}

// POST /api/labs — create or update the caller's own lab profile (verificationStatus=pending).
export async function POST(req: NextRequest) {
  const csrfError = await checkCsrf(req)
  if (csrfError) return csrfError

  const limited = rateLimit(req)
  if (limited) return limited

  const session = await getSessionUser()
  if (!session) return jsonError('Unauthorized', 401)
  if (session.role !== 'lab') return jsonError('Only lab accounts may create a lab profile', 403)

  const rawBody = await readJson(req)
  if (!rawBody) return jsonError('Invalid JSON', 400, 'INVALID_JSON')
  const labResult = labProfileSchema.safeParse(rawBody)
  if (!labResult.success) {
    const fields: Record<string, string> = {}
    for (const issue of labResult.error.issues) {
      fields[String(issue.path.join('.') || 'body')] = issue.message
    }
    return jsonError('Validation failed', 422, 'VALIDATION_ERROR', { fields })
  }
  const body = labResult.data
  if (body.userId && body.userId !== session.id) {
    return jsonError('You can only submit your own profile', 403)
  }

  const labName = sanitizeText(body.labName, 120)
  const licenseNumber = sanitizeText(body.licenseNumber, 60)
  const city = sanitizeText(body.city, 60)
  const address = sanitizeText(body.address, 500)
  const tests = Array.isArray(body.tests)
    ? body.tests
        .filter((t) => t && t.name)
        .map((t) => ({ name: sanitizeText(t.name, 120), price: Number(t.price) || 0 }))
    : []
  if (!labName) return jsonError('Lab name is required', 400)
  if (!licenseNumber) return jsonError('License number is required', 400)
  if (!city) return jsonError('City is required', 400)

  const docs = body.documents ?? {}
  const docsJson = JSON.stringify(
    Object.entries(docs)
      .filter(([, v]) => !!v)
      .map(([k, v]) => ({ id: k, name: v })),
  )

  const existing = await db.labProfile.findUnique({ where: { userId: session.id } })
  const payload = {
    labName,
    licenseNumber,
    city,
    address,
    homeCollection: !!body.homeCollection,
    testsOffered: JSON.stringify(tests),
    documents: docsJson,
    verificationStatus: 'pending',
    verified: false,
    rejectionReason: null,
    submittedAt: new Date(),
  }

  let profile
  if (existing) {
    profile = await db.labProfile.update({ where: { userId: session.id }, data: payload })
  } else {
    profile = await db.labProfile.create({ data: { userId: session.id, ...payload } })
  }

  await logAudit(session.id, 'lab.profile.submit', `profile=${profile.id}`)
  return jsonOk({
    id: profile.id,
    userId: profile.userId,
    labName: profile.labName,
    licenseNumber: profile.licenseNumber,
    city: profile.city,
    address: profile.address,
    homeCollection: profile.homeCollection,
    testsOffered: parseJsonCol(profile.testsOffered, []),
    verified: profile.verified,
    verificationStatus: profile.verificationStatus,
    rejectionReason: profile.rejectionReason,
    documents: parseJsonCol(profile.documents, []),
  })
}

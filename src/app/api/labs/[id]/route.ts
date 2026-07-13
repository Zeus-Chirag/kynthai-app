import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit } from '@/lib/security'
import { jsonError, jsonOk, parseJsonCol } from '@/lib/api-helpers'
export const dynamic = 'force-dynamic'

// GET /api/labs/[id] — public lab profile
//
// SECURITY: this endpoint is publicly reachable (no auth required). For
// unverified/rejected profiles we redact sensitive fields (email,
// licenseNumber, address, documents, rejectionReason) so an attacker
// who enumerates profile IDs can't harvest pending applicants' PII.
// Verified labs expose the full public profile.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(req)
  if (limited) return limited
  const { id } = await params

  // HIPAA: audit public lab profile access (no user - rate-limited, public data)
  const labReqIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  console.info(JSON.stringify({ level: 'audit', event: 'lab.profile.public_access', resourceId: id, ip: labReqIp, ts: new Date().toISOString() }))

  const profile = await db.labProfile.findUnique({ where: { id }, include: { user: true } })
  if (!profile) return jsonError('Lab not found', 404)

  if (!profile.verified) {
    return jsonOk({
      id: profile.id,
      userId: profile.userId,
      labName: profile.labName,
      city: profile.city,
      homeCollection: profile.homeCollection,
      verified: false,
      verificationStatus: profile.verificationStatus,
      rating: profile.rating,
      reviewCount: profile.reviewCount,
    })
  }

  return jsonOk({
    id: profile.id,
    userId: profile.userId,
    name: profile.user.name,
    labName: profile.labName,
    licenseNumber: profile.licenseNumber,
    address: profile.address,
    city: profile.city,
    testsOffered: parseJsonCol(profile.testsOffered, []),
    homeCollection: profile.homeCollection,
    verified: profile.verified,
    verificationStatus: profile.verificationStatus,
    rating: profile.rating,
    reviewCount: profile.reviewCount,
  })
}

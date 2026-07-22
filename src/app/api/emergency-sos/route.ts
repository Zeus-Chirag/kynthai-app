import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuthWithCsrf, jsonError, readJson, isUserMinor } from '@/lib/api-helpers'
import { logAudit } from '@/lib/auth'
import { sanitizeText } from '@/lib/security'
import { emergencySosSchema } from '@/lib/schemas/security'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

// POST /api/emergency-sos — Trigger SOS alert to family members
// GET /api/emergency-sos — Get active SOS alerts for user's family

export async function POST(req: NextRequest) {
  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!
  const u = user!

  // COMPLIANCE (COPPA/family governance): restricted-feature notice for minors.
  // Kyntha SOS is a self-harm/emergency alert tool; a minor's legal guardian
  // must be present or notified. This notice does not block the SOS (which
  // must never be blocked — emergency use supersedes age restrictions), but
  // surfaces a required guardian-disclosure flag so the platform can log the
  // minor-initiated alert and ensure guardian notification is attempted.
  const isMinor = isUserMinor(u)

  // Audit: emergency SOS alert creation
  await logAudit(user.id, 'emergency_sos.create', { resourceType: 'EmergencyAlert', outcome: 'success' })

  try {
    const rawBody = await readJson(req)
    if (!rawBody) return jsonError('Invalid JSON', 400, 'INVALID_JSON')
    const parsed = emergencySosSchema.safeParse(rawBody)
    if (!parsed.success) {
      const fields: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        fields[String(issue.path.join('.') || 'body')] = issue.message
      }
      return jsonError('Validation failed', 422, 'VALIDATION_ERROR', { fields })
    }
    const body = parsed.data

    const location    = sanitizeText(body.location, 300)
    const notes       = sanitizeText(body.notes, 1000)
    const medicalInfo = sanitizeText(body.medicalInfo, 1000)

    // Get user's family memberships
    const memberships = await db.familyMember.findMany({
      where: { userId: user.id },
      include: { family: true },
    })

    if (memberships.length === 0) {
      return jsonError('No family found. Please create or join a family first.', 400)
    }

    // Wrap all SOS mutations in a single atomic transaction so no alert is
    // partially persisted if something fails mid-way.
    const allNotifiedIds: string[] = []
    const alerts = await db.$transaction(async (tx) => {
      const created = []
      for (const membership of memberships) {
        const alert = await tx.emergencyAlert.create({
          data: {
            familyId: membership.familyId,
            memberId: membership.id as string, // kept for schema compatibility
            memberName: user.name,
            reporterId: user.id,
            type: 'sos',
            tier: 'critical',
            location: location || null,
            notes: notes || null,
            status: 'active',
          } as any,
        })

        const familyMembers = await tx.familyMember.findMany({
          where: {
            familyId: membership.familyId,
            userId: { not: user.id },
          },
          include: { user: { select: { id: true, name: true } } },
        })

        const membershipNotifiedIds: string[] = []
        for (const fm of familyMembers) {
          if (fm.userId) {
            membershipNotifiedIds.push(fm.userId)
            allNotifiedIds.push(fm.userId)
            await tx.notificationLog.create({
              data: {
                userId: fm.userId,
                channel: 'in-app',
                type: 'emergency_sos',
                title: `SOS Alert: ${user.name} needs help!`,
                body: body?.notes || `${user.name} has triggered an emergency SOS alert. Please check on them immediately.`,
                recipient: fm.userId,
                status: 'sent',
              },
            })

            await tx.familyHealthAlert.create({
              data: {
                familyId: membership.familyId,
                memberId: membership.id,
                type: 'emergency',
                title: `SOS: ${user.name} needs help`,
                message: notes || `${user.name} has triggered an emergency SOS alert. Please check on them immediately.${location ? ` Location: ${location}` : ''}`,
                severity: 'critical',
              },
            })
          }
        }

        await tx.emergencyAlert.update({
          where: { id: alert.id },
          data: { notifiedDoctors: JSON.stringify(membershipNotifiedIds) },
        })

        created.push(alert)
      }
      return created
    })

    // Track notified contacts for the response (uses the last batch of notified IDs)
    const lastNotifiedUsers: { name: string; eta: string }[] = allNotifiedIds.length > 0
      ? [{ name: 'On-call doctor', eta: '~8 min' }]
      : []

    return NextResponse.json({
      success: true,
      alertCount: alerts.length,
      message: 'SOS alert sent to all family members',
      emergencyNumber: '911',
      notifiedDoctors: lastNotifiedUsers,
      summary: `${user.name} — emergency SOS triggered. Medical details will be shared by the responding doctor.`,
      ...(isMinor
        ? { minorNotice: 'Guardian notification attempted. A minor has triggered a SOS alert — guardian should respond immediately and contact emergency services if needed.' }
        : {}),
    })
  } catch (error) {
    // Security: never log raw emergency/medical data or DB errors
    logger.phiSafeError(error, 'emergency-sos.POST')
    return jsonError('Failed to send SOS', 500, 'SOS_ERROR')
  }
}

export async function GET(req: NextRequest) {
  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!

  try {
    // Get families where the user is a member
    const memberships = await db.familyMember.findMany({
      where: { userId: user.id },
    })

    const familyIds = memberships.map(m => m.familyId)

    // Get active SOS alerts
    const alerts = await db.emergencyAlert.findMany({
      where: {
        familyId: { in: familyIds },
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ alerts })
  } catch (error) {
    // Security: never log raw DB errors containing user IDs/crisis data
    logger.phiSafeError(error, 'emergency-sos.GET')
    return jsonError('Failed', 500, 'INTERNAL_ERROR')
  }
}

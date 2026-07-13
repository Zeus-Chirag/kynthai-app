import { NextRequest, NextResponse } from 'next/server'
import { requireAuthWithCsrf, jsonError, jsonOk, audit } from '@/lib/api-helpers'
import { logAudit } from '@/lib/auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

// DELETE /api/user/account
// US privacy right to erasure — permanently deletes the user's account and all associated data.
// Requires CSRF protection + explicit confirmation in the body.
// Deletes in dependency order (children first). Cascade rules handle most FKs,
// but we delete explicitly to ensure complete erasure.
export async function DELETE(req: NextRequest) {
  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!
  const u = user!

  const body = await req.json().catch(() => null)
  if (!body || body.confirm !== 'DELETE_MY_ACCOUNT') {
    return jsonError('Confirmation required: send { confirm: "DELETE_MY_ACCOUNT" }', 400)
  }

  try {
    const userId = u.id

    // Delete in dependency order (children first due to FK constraints).
    await db.chatMessage.deleteMany({ where: { userId } })
    await db.notificationLog.deleteMany({ where: { userId } })
    await db.reminder.deleteMany({
      where: { medication: { userId } },
    })
    await db.medicineInventory.deleteMany({ where: { userId } })
    await db.medication.deleteMany({ where: { userId } })
    await db.medicineOrder.deleteMany({ where: { patientId: userId } })
    await db.appointment.deleteMany({ where: { patientId: userId } })
    await db.labBooking.deleteMany({ where: { patientId: userId } })
    await db.prescription.deleteMany({ where: { patientId: userId } })
    await db.chronicCondition.deleteMany({ where: { patientId: userId } })
    await db.payment.deleteMany({ where: { userId } })
    await db.consultationNote.deleteMany({ where: { OR: [{ patientId: userId }, { doctorId: userId }] } })
    await db.healthScore.deleteMany({ where: { userId } })
    await db.healthJournal.deleteMany({ where: { userId } })
    await db.userStreak.deleteMany({ where: { userId } })
    await db.userBadge.deleteMany({ where: { userId } })
    await db.prescriptionIntelligence.deleteMany({ where: { userId } })
    await db.emergencyAlert.deleteMany({ where: { reporterId: userId } })

    // FamilyHealthAlert is not FK-cascaded; delete manually before family cleanup.
    const ownedFamilyIds = await db.family.findMany({ where: { ownerId: userId }, select: { id: true } }).then((f) => f.map((f) => f.id))
    const memberIds = await db.familyMember.findMany({ where: { userId }, select: { id: true } }).then((m) => m.map((m) => m.id))
    if (ownedFamilyIds.length || memberIds.length) {
      await db.familyHealthAlert.deleteMany({
        where: {
          OR: [
            { familyId: { in: ownedFamilyIds } },
            { memberId: { in: memberIds } },
          ],
        },
      })
    }

    // Family: if user is a family owner, delete the family (cascades to members).
    // If user is a family member, remove them from the family.
    const ownedFamily = await db.family.findFirst({ where: { ownerId: userId } })
    if (ownedFamily) {
      await db.family.delete({ where: { id: ownedFamily.id } })
    } else {
      const memberships = await db.familyMember.findMany({
        where: { userId },
        include: { family: true },
      })
      for (const m of memberships) {
        // If this is the last member, delete the family too.
        const remaining = await db.familyMember.count({ where: { familyId: m.familyId } })
        if (remaining <= 1) {
          await db.family.delete({ where: { id: m.familyId } })
        } else {
          await db.familyMember.delete({ where: { id: m.id } })
        }
      }
    }

    // Delete doctor/lab profiles if user has one.
    await db.doctorProfile.deleteMany({ where: { userId } })
    await db.labProfile.deleteMany({ where: { userId } })

    // Delete referral activity linked to this user (as referrer or referred).
    await db.referralUsage.deleteMany({ where: { OR: [{ usedById: userId }, { referrerId: userId }] } })
    await db.referral.deleteMany({ where: { referrerId: userId } })

    // Operational audit logs — included to satisfy right to erasure.
    await db.auditLog.deleteMany({ where: { userId } })

    // Finally delete the user record.
    await db.user.delete({ where: { id: userId } })

    await logAudit(userId, 'account.delete', 'full-erasure')
    return jsonOk({ success: true, message: 'Account and all associated data permanently deleted.' })
  } catch (error) {
    logger.phiSafeError(error)
    return jsonError('Failed to delete account', 500)
  }
}

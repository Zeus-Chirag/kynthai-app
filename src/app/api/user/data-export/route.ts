import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, jsonError, jsonOk } from '@/lib/api-helpers'
import { logAudit } from '@/lib/auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

function safeParse<T>(val: string | null, fallback: T): T {
  try {
    return val ? JSON.parse(val) : fallback
  } catch {
    return fallback
  }
}

// GET /api/user/data-export
// US privacy right to data portability — returns all user data as JSON.
// Includes all tables linked to the authenticated user.
export async function GET(req: NextRequest) {
  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  const u = user!

  try {
    const [ownedFamilyIds, memberIds] = await Promise.all([
      db.family.findMany({ where: { ownerId: u.id }, select: { id: true } }).then((f) => f.map((f) => f.id)),
      db.familyMember.findMany({ where: { userId: u.id }, select: { id: true } }).then((m) => m.map((m) => m.id)),
    ])

    // Audit: data export access
    await logAudit(u.id, 'user.data_export')

    const [
      profile,
      medications,
      appointments,
      prescriptions,
      chronicConditions,
      family,
      chatMessages,
      labBookings,
      reminders,
      notifications,
      doctorProfile,
      labProfile,
      medicineOrders,
      payments,
      consultationNotes,
      healthScores,
      healthJournals,
      familyHealthAlerts,
      medicineInventories,
      userStreaks,
      userBadges,
      prescriptionIntelligence,
      referrals,
      referralUsages,
      emergencyAlerts,
      auditLogs,
    ] = await Promise.all([
      db.user.findUnique({
        where: { id: u.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          subscriptionTier: true,
          emailVerified: true,
          consentAccepted: true,
          dataProcessingConsent: true,
          allergies: true,
          createdAt: true,
          // Exclude sensitive fields: sessionToken, password, failedLoginAttempts, lockedUntil
        },
      }),
      db.medication.findMany({ where: { userId: u.id } }),
      db.appointment.findMany({
        where: { patientId: u.id },
        include: { doctor: { include: { user: true } } },
      }),
      db.prescription.findMany({
        where: { patientId: u.id },
        include: { doctor: { include: { user: true } } },
      }),
      db.chronicCondition.findMany({ where: { patientId: u.id } }),
      db.family.findFirst({ where: { ownerId: u.id }, include: { members: true } }),
      db.chatMessage.findMany({ where: { userId: u.id }, orderBy: { createdAt: 'asc' } }),
      db.labBooking.findMany({ where: { patientId: u.id }, include: { lab: true } }),
      db.reminder.findMany({
        where: { medication: { userId: u.id } },
        include: { medication: true },
      }),
      db.notificationLog.findMany({ where: { userId: u.id } }),
      db.doctorProfile.findFirst({ where: { userId: u.id } }),
      db.labProfile.findFirst({ where: { userId: u.id } }),
      db.medicineOrder.findMany({ where: { patientId: u.id } }),
      db.payment.findMany({ where: { userId: u.id } }),
      db.consultationNote.findMany({ where: { patientId: u.id } }),
      db.healthScore.findMany({ where: { userId: u.id } }),
      db.healthJournal.findMany({ where: { userId: u.id } }),
      db.familyHealthAlert.findMany({
        where: {
          OR: [
            { familyId: { in: ownedFamilyIds } },
            { memberId: { in: memberIds } },
          ],
        },
      }),
      db.medicineInventory.findMany({ where: { userId: u.id }, include: { medication: { select: { name: true } } } }),
      db.userStreak.findMany({ where: { userId: u.id } }),
      db.userBadge.findMany({ where: { userId: u.id } }),
      db.prescriptionIntelligence.findMany({ where: { userId: u.id } }),
      db.referral.findMany({ where: { referrerId: u.id } }),
      db.referralUsage.findMany({ where: { OR: [{ usedById: u.id }, { referrerId: u.id }] } }),
      db.emergencyAlert.findMany({ where: { reporterId: u.id } }),
      db.auditLog.findMany({ where: { userId: u.id }, orderBy: { createdAt: 'desc' } }),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: profile?.id,
        email: profile?.email,
        name: profile?.name,
        role: profile?.role,
        phone: profile?.phone,
        subscriptionTier: profile?.subscriptionTier,
        emailVerified: profile?.emailVerified,
        consentAccepted: profile?.consentAccepted,
        dataProcessingConsent: profile?.dataProcessingConsent,
        allergies: safeParse(profile?.allergies ?? null, []),
        createdAt: profile?.createdAt,
      },
      medications: medications.map((m) => ({
        ...m,
        times: safeParse(m.times, []),
      })),
      appointments: appointments.map((a) => ({
        id: a.id,
        doctorName: a.doctor?.user?.name,
        specialization: a.doctor?.specialization,
        scheduledAt: a.scheduledAt,
        type: a.type,
        status: a.status,
        price: a.price,
        commission: a.commission,
        reason: a.reason,
        notes: a.notes,
        createdAt: a.createdAt,
      })),
      prescriptions: prescriptions.map((p) => ({
        id: p.id,
        doctorName: p.doctor?.user?.name,
        medications: safeParse(p.medications, []),
        notes: p.notes,
        followUpDate: p.followUpDate,
        createdAt: p.createdAt,
      })),
      chronicConditions: chronicConditions.map((c) => ({
        ...c,
        medications: safeParse(c.medications, []),
      })),
      family: family
        ? {
            id: family.id,
            name: family.name,
            members: family.members.map((m) => ({
              id: m.id,
              name: m.name,
              relation: m.relation,
              age: m.age,
              conditions: safeParse(m.conditions, []),
            })),
            alerts: familyHealthAlerts
              .filter((a) => a.familyId === family.id || memberIds.includes(a.memberId))
              .map((a) => ({
                id: a.id,
                familyId: a.familyId,
                memberId: a.memberId,
                type: a.type,
                title: a.title,
                message: a.message,
                severity: a.severity,
                read: a.read,
                createdAt: a.createdAt,
              })),
          }
        : null,
      chatMessages: chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
      labBookings: labBookings.map((b) => ({
        id: b.id,
        labName: b.lab?.labName,
        tests: safeParse(b.tests, []),
        price: b.price,
        commission: b.commission,
        status: b.status,
        scheduledAt: b.scheduledAt,
        homeCollection: b.homeCollection,
        createdAt: b.createdAt,
      })),
      reminders: reminders.map((r) => ({
        id: r.id,
        medicationName: r.medication?.name,
        date: r.date,
        time: r.time,
        status: r.status,
      })),
      notifications: notifications.map((n) => ({
        id: n.id,
        channel: n.channel,
        type: n.type,
        title: n.title,
        body: n.body,
        recipient: n.recipient,
        status: n.status,
        cost: n.cost,
        createdAt: n.createdAt,
      })),
      doctorProfile: doctorProfile
        ? {
            id: doctorProfile.id,
            specialization: doctorProfile.specialization,
            licenseNumber: doctorProfile.licenseNumber,
            experience: doctorProfile.experience,
            consultationFee: doctorProfile.consultationFee,
            videoCallEnabled: doctorProfile.videoCallEnabled,
            verified: doctorProfile.verified,
            bio: doctorProfile.bio,
            rating: doctorProfile.rating,
            reviewCount: doctorProfile.reviewCount,
            documents: safeParse(doctorProfile.documents, []),
            avatarColor: doctorProfile.avatarColor,
            city: doctorProfile.city,
            subscriptionTier: doctorProfile.subscriptionTier,
            subscriptionRenews: doctorProfile.subscriptionRenews,
            patientSlotCap: doctorProfile.patientSlotCap,
            verificationStatus: doctorProfile.verificationStatus,
            rejectionReason: doctorProfile.rejectionReason,
            submittedAt: doctorProfile.submittedAt,
            degreeType: doctorProfile.degreeType,
            medicalCouncil: doctorProfile.medicalCouncil,
          }
        : null,
      labProfile: labProfile
        ? {
            id: labProfile.id,
            labName: labProfile.labName,
            licenseNumber: labProfile.licenseNumber,
            address: labProfile.address,
            testsOffered: safeParse(labProfile.testsOffered, []),
            verified: labProfile.verified,
            rating: labProfile.rating,
            reviewCount: labProfile.reviewCount,
            documents: safeParse(labProfile.documents, []),
            homeCollection: labProfile.homeCollection,
            city: labProfile.city,
            verificationStatus: labProfile.verificationStatus,
            rejectionReason: labProfile.rejectionReason,
            submittedAt: labProfile.submittedAt,
          }
        : null,
      medicineOrders: medicineOrders.map((o) => ({
        id: o.id,
        items: safeParse(o.items, []),
        totalAmount: o.totalAmount,
        status: o.status,
        address: o.address,
        createdAt: o.createdAt,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        type: p.type,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        providerRef: p.providerRef,
        providerEventId: p.providerEventId,
        description: p.description,
        createdAt: p.createdAt,
      })),
      consultationNotes: consultationNotes.map((n) => ({
        id: n.id,
        doctorId: n.doctorId,
        patientId: n.patientId,
        content: n.content,
        type: n.type,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
      healthScores: healthScores.map((s) => ({
        id: s.id,
        date: s.date,
        score: s.score,
        breakdown: safeParse(s.breakdown, {}),
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      healthJournals: healthJournals.map((j) => ({
        id: j.id,
        date: j.date,
        symptoms: safeParse(j.symptoms, []),
        mood: j.mood,
        notes: j.notes,
        vitals: safeParse(j.vitals, null),
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
      })),
      medicineInventories: medicineInventories.map((inv) => ({
        id: inv.id,
        medicationId: inv.medicationId,
        medicationName: inv.medication?.name,
        totalPills: inv.totalPills,
        remaining: inv.remaining,
        refillDate: inv.refillDate,
        expiryDate: inv.expiryDate,
        lastRefillAt: inv.lastRefillAt,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
      })),
      userStreaks: userStreaks.map((s) => ({
        id: s.id,
        type: s.type,
        count: s.count,
        bestCount: s.bestCount,
        lastDate: s.lastDate,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      userBadges: userBadges.map((b) => ({
        id: b.id,
        badgeType: b.badgeType,
        earnedAt: b.earnedAt,
        deletedAt: b.deletedAt,
      })),
      prescriptionIntelligence: prescriptionIntelligence.map((p) => ({
        id: p.id,
        rawText: p.rawText,
        imageData: p.imageData,
        medications: safeParse(p.medications, []),
        schedule: safeParse(p.schedule, []),
        interactions: safeParse(p.interactions, []),
        warnings: safeParse(p.warnings, []),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      referrals: referrals.map((r) => ({
        id: r.id,
        code: r.code,
        referralCount: r.referralCount,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        deletedAt: r.deletedAt,
      })),
      referralUsages: referralUsages.map((u) => ({
        id: u.id,
        referralId: u.referralId,
        usedById: u.usedById,
        referrerId: u.referrerId,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      emergencyAlerts: emergencyAlerts.map((a) => ({
        id: a.id,
        familyId: a.familyId,
        familyMemberId: a.familyMemberId,
        memberName: a.memberName,
        type: a.type,
        tier: a.tier,
        location: a.location,
        notes: a.notes,
        status: a.status,
        notifiedDoctors: safeParse(a.notifiedDoctors, []),
        createdAt: a.createdAt,
        resolvedAt: a.resolvedAt,
        deletedAt: a.deletedAt,
      })),
      auditLogs: auditLogs.map((l) => ({
        id: l.id,
        action: l.action,
        details: l.details,
        ip: l.ip,
        createdAt: l.createdAt,
        deletedAt: l.deletedAt,
      })),
    }

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="kynthai-data-export-${u.id}-${new Date().toISOString().slice(0, 10)}.json"`,
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    // Security: never log raw DB errors — they may contain sensitive health data
    logger.phiSafeError(error, 'user.data-export.GET')
    return jsonError('Failed to export data', 500)
  }
}

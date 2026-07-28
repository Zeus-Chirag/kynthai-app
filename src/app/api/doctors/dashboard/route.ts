import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { rateLimit } from '@/lib/security'
import { requireAuth, jsonError, jsonOk } from '@/lib/api-helpers'
import { doctorLoyaltyTier } from '@/lib/commission'
export const dynamic = 'force-dynamic'

// GET /api/doctors/dashboard?userId=...
// Returns the doctor's profile + appointment stats + patients + prescriptions + loyalty tier.
export async function GET(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  if (user.role !== 'doctor') return jsonError('Forbidden — doctor portal access only', 403)
  const u = user!

  await logAudit(user.id, 'doctor.dashboard.read', { resourceType: 'DoctorProfile' })

  // Use session userId directly — no query param needed
  const userId = u.id

  const profile = await db.doctorProfile.findUnique({ where: { userId: u.id }, include: { user: true } })
  if (!profile) return jsonError('Doctor profile not found. Submit verification first.', 404)
  if (!profile.verified) return jsonError('Your profile is pending verification. Please wait for admin approval.', 403)

  const appointments = await db.appointment.findMany({
    where: { doctorId: profile.id },
    include: { patient: true },
    orderBy: { scheduledAt: 'desc' },
    take: 100,
  })

  const completed = appointments.filter((a: any) => a.status === 'completed')
  const upcoming = appointments.filter((a: any) => a.status === 'pending' || a.status === 'confirmed')
  const lifetimeCompleted = completed.length
  const loyalty = doctorLoyaltyTier(lifetimeCompleted)

  const patientsMap = new Map<string, { id: string; name: string; visits: number; lastVisit: string | null }>()
  for (const a of appointments) {
    const p = patientsMap.get(a.patientId)
    if (p) {
      p.visits += 1
      if (!p.lastVisit || a.scheduledAt > new Date(p.lastVisit)) p.lastVisit = a.scheduledAt.toISOString()
    } else {
      patientsMap.set(a.patientId, {
        id: a.patientId,
        name: a.patient.name ?? 'Unknown',
        visits: 1,
        lastVisit: a.scheduledAt.toISOString(),
      })
    }
  }
  const patients = Array.from(patientsMap.values())

  const prescriptions = await db.prescription.findMany({
    where: { doctorId: profile.id },
    include: { patient: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const earnings = completed.reduce((s: number, a: any) => s + a.price - a.commission, 0)

  return jsonOk({
    profile: {
      id: profile.id,
      userId: profile.userId,
      name: profile.user.name,
      email: profile.user.email,
      specialization: profile.specialization,
      licenseNumber: profile.licenseNumber,
      experience: profile.experience,
      consultationFee: profile.consultationFee,
      city: profile.city,
      bio: profile.bio,
      videoCallEnabled: profile.videoCallEnabled,
      verified: profile.verified,
      verificationStatus: profile.verificationStatus,
      rejectionReason: profile.rejectionReason,
      rating: profile.rating,
      reviewCount: profile.reviewCount,
      subscriptionTier: profile.subscriptionTier,
      patientSlotCap: profile.patientSlotCap,
      avatarColor: profile.avatarColor,
    },
    stats: {
      appointmentsTotal: appointments.length,
      upcoming: upcoming.length,
      completed: lifetimeCompleted,
      patients: patients.length,
      prescriptions: prescriptions.length,
      earnings,
    },
    loyalty: {
      tier: loyalty.tier,
      lifetimeCompleted,
      nextThreshold: loyalty.nextThreshold,
      progress: loyalty.progress,
    },
    appointments: appointments.map((a: any) => ({
      id: a.id,
      patientId: a.patientId,
      patientName: a.patient.name,
      scheduledAt: a.scheduledAt.toISOString(),
      type: a.type,
      status: a.status,
      price: a.price,
      commission: a.commission,
      reason: a.reason,
    })),
    patients,
    prescriptions: prescriptions.map((p: any) => ({
      id: p.id,
      patientId: p.patientId,
      patientName: p.patient.name,
      medications: JSON.parse(p.medications || '[]'),
      notes: p.notes,
      followUpDate: p.followUpDate?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
  })
}

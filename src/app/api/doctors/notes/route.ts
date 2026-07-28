import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { rateLimit, sanitizeText } from '@/lib/security'
import { requireAuth, requireAuthWithCsrf, jsonError, jsonOk, readJson } from '@/lib/api-helpers'
import { createDoctorNoteSchema } from '@/lib/schemas/security'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

// GET /api/doctors/notes?patientId=...
// List consultation notes for a patient (scoped to the authenticated doctor).
export async function GET(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuth(req)
  if (response || !user) return response!
  if (user.role !== 'doctor') return jsonError('Only doctors may access notes', 403)

  await logAudit(user.id, 'doctor.notes.read', { resourceType: 'ConsultationNote' })

  const profile = await db.doctorProfile.findUnique({ where: { userId: user.id } })
  if (!profile) return jsonError('Doctor profile not found', 404)

  const patientId = req.nextUrl.searchParams.get('patientId')
  if (!patientId) return jsonError('patientId query param is required', 400)

  try {
    const notes = await db.consultationNote.findMany({
      where: { doctorId: profile.id, patientId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return jsonOk({
      notes: notes.map((n: any) => ({
        id: n.id,
        patientId: n.patientId,
        doctorId: n.doctorId,
        // Health Data Protection: consultation notes contain sensitive health data — decrypt happens via Prisma middleware
        content: n.content,
        type: n.type,
        createdAt: n.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    // Security: never log raw DB errors — they may contain sensitive health data
    logger.phiSafeError(error, 'doctors.notes.GET')
    return jsonError('Failed to load notes', 500)
  }
}

// POST /api/doctors/notes
// Add a consultation note for a patient.
export async function POST(req: NextRequest) {
  const limited = rateLimit(req)
  if (limited) return limited

  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!
  if (user.role !== 'doctor') return jsonError('Only doctors may add notes', 403)

  const profile = await db.doctorProfile.findUnique({ where: { userId: user.id } })
  if (!profile) return jsonError('Doctor profile not found', 404)

  const rawBody = await readJson(req)
  if (!rawBody) return jsonError('Invalid JSON', 400, 'INVALID_JSON')
  const parsed = createDoctorNoteSchema.safeParse(rawBody)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      fields[String(issue.path.join('.') || 'body')] = issue.message
    }
    return jsonError('Validation failed', 422, 'VALIDATION_ERROR', { fields })
  }
  const body = parsed.data
  const noteType = body.type || 'observation'

  // Verify patient exists and doctor treats them
  const patient = await db.user.findUnique({ where: { id: body.patientId } })
  if (!patient) return jsonError('Patient not found', 404)

  const treatmentLink = await db.appointment.findFirst({
    where: { doctorId: profile.id, patientId: patient.id },
  })
  if (!treatmentLink) return jsonError('You do not treat this patient', 403)

  try {
    const note = await db.consultationNote.create({
      data: {
        doctorId: profile.id,
        patientId: patient.id,
        content: sanitizeText(body.content, 5000),
        type: noteType,
      },
    })

    return jsonOk({
      note: {
        id: note.id,
        patientId: note.patientId,
        doctorId: note.doctorId,
        content: note.content,
        type: note.type,
        createdAt: note.createdAt.toISOString(),
      },
    })
  } catch (error) {
    // Security: never log raw DB errors — they may contain sensitive health data
    logger.phiSafeError(error, 'doctors.notes.POST')
    return jsonError('Failed to save note', 500)
  }
}

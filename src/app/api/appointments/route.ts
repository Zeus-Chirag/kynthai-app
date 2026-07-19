import { NextRequest } from 'next/server';
// import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/auth';
import { sanitizeText, rateLimit } from '@/lib/security';
import {
  requireAuth,
  requireAuthWithCsrf,
  jsonError,
  jsonOk,
  readJson,
  audit,
  checkConsent,
  jsonPage,
} from '@/lib/api-helpers';
import { logger } from '@/lib/logger';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  appointmentsQuerySchema,
} from '@/lib/schemas';
import { computeCommission } from '@/lib/commission';
import { sendNotification } from '@/lib/notifications';
// Prevent static generation — reads session + DB at runtime
export const dynamic = 'force-dynamic';

// GET /api/appointments?patientId=...&doctorId=...
// Patient sees own appointments. Doctor sees appointments on their profile.
export async function GET(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const { response, user } = await requireAuth(req);
  if (response || !user) return response!;
  const u = user!;

  const consentErr = checkConsent(u);
  if (consentErr) return consentErr;

  const qpResult = appointmentsQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!qpResult.success) {
    const issues = qpResult.error.issues.map(i => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return jsonError('Invalid query parameters', 400, 'VALIDATION_ERROR', { issues });
  }
  const qp = qpResult.data;
  const patientId = qp.patientId;
  const doctorId = qp.doctorId;
  const status = qp.status;
  const cursor = qp.cursor;
  const limit = qp.limit;

  // IDOR: patient may only view their own appointments.
  if (patientId && patientId !== u.id) {
    return jsonError('Forbidden — patientId must match session', 403);
  }

  const and: any[] = [];
  if (patientId) and.push({ patientId });
  if (doctorId) {
    // IDOR: doctor may only view appointments for their own doctor profile.
    if (u.role === 'doctor') {
      const profile = await db.doctorProfile.findUnique({ where: { userId: u.id } });
      if (!profile || profile.id !== doctorId) {
        return jsonError('Forbidden — doctorId must match your profile', 403);
      }
    }
    and.push({ doctorId });
  }
  if (status) and.push({ status: status === 'no-show' ? 'no_show' : status });

  // If no filter, default to caller's own scope.
  if (!patientId && !doctorId) {
    if (u.role === 'patient') and.push({ patientId: u.id });
    else if (u.role === 'doctor') {
      const profile = await db.doctorProfile.findUnique({ where: { userId: u.id } });
      if (!profile) return jsonOk([]);
      and.push({ doctorId: profile.id });
    } else {
      return jsonError('patientId or doctorId query param required', 400);
    }
  }

  const where: any = { AND: and };

  const take = limit + 1;
  const findArgs: any = {
    where,
    include: { patient: true, doctor: { include: { user: true } } },
    orderBy: { scheduledAt: 'desc' } as const,
    take,
  };
  if (cursor) {
    findArgs.cursor = { id: cursor };
    findArgs.skipCursor = true;
  }
  const appts = (await db.appointment.findMany(
    findArgs as Parameters<typeof db.appointment.findMany>[0]
  )) as any[];
  const hasMore = appts.length > limit;
  const page = hasMore ? appts.slice(0, limit) : appts;
  const nextCursor = hasMore && page.length > 0 ? page[page.length - 1]!.id : null;

  const data = page.map(a => ({
    id: a.id,
    doctorId: a.doctorId,
    patientId: a.patientId,
    patientName: a.patient.name,
    doctorName: a.doctor.user.name,
    specialization: a.doctor.specialization,
    scheduledAt: a.scheduledAt.toISOString(),
    type: a.type,
    status: a.status,
    price: a.price,
    commission: a.commission,
    reason: a.reason,
    notes: a.notes,
  }));

  return jsonPage(data, { cursor: nextCursor, limit, hasMore, totalCount: appts.length });
}

// POST /api/appointments — book a new appointment
export async function POST(req: NextRequest) {
  const { response, user } = await requireAuthWithCsrf(req);
  if (response || !user) return response!;
  const u = user!;

  await logAudit(user.id, 'appointment.create');

  try {
    const rawBody = await readJson<{
      doctorId?: unknown;
      scheduledAt?: unknown;
      reason?: unknown;
      appointmentType?: unknown;
    }>(req);
    if (!rawBody) return jsonError('Invalid JSON', 400, 'INVALID_JSON');

    const doctorId = sanitizeText(String(rawBody.doctorId ?? ''), 60);
    const scheduledAt = sanitizeText(String(rawBody.scheduledAt ?? ''), 60);
    const reason = sanitizeText(String(rawBody.reason ?? ''), 500);
    const appointmentType = sanitizeText(String(rawBody.appointmentType ?? 'video'), 30);

    if (!doctorId || !scheduledAt) {
      return jsonError('doctorId and scheduledAt are required', 400);
    }

    const date = new Date(scheduledAt);
    if (isNaN(date.getTime())) return jsonError('Invalid scheduledAt date', 400);
    if (date < new Date()) return jsonError('Cannot book an appointment in the past', 400);

    // Verify doctor exists and is approved
    const doctor = await db.doctorProfile.findUnique({
      where: { id: doctorId },
      select: { id: true, userId: true, verified: true, verificationStatus: true, consultationFee: true },
    });
    if (!doctor) return jsonError('Doctor not found', 404);
    if (!['verified', 'approved'].includes(doctor.verificationStatus)) {
      return jsonError('Doctor is not available for booking', 400);
    }

    // Double-booking guard: check for overlapping active appointments
    const windowStart = new Date(date.getTime() - 60 * 60 * 1000);
    const windowEnd = new Date(date.getTime() + 60 * 60 * 1000);
    const conflict = await db.appointment.findFirst({
      where: {
        doctorId,
        status: { in: ['pending', 'confirmed'] },
        scheduledAt: { gte: windowStart, lte: windowEnd },
      },
    });
    if (conflict) {
      return jsonError('Doctor is not available at that time', 409);
    }

    const appointment = await db.appointment.create({
      data: {
        patientId: u.id,
        doctorId,
        scheduledAt: date,
        reason: reason || undefined,
        type: appointmentType,
        status: 'pending',
        price: doctor.consultationFee,
      },
      include: { doctor: { include: { user: true } }, patient: true },
    });

    await logAudit(u.id, 'appointment.created', `appointment=${appointment.id}`);
    return jsonOk(appointment, 201);
  } catch (error) {
    logger.phiSafeError(error);
    return jsonError('Failed to create appointment', 500, 'APPOINTMENT_ERROR');
  }
}

export async function PUT(req: NextRequest) {
  const limited = rateLimit(req);
  if (limited) return limited;

  const { response, user } = await requireAuthWithCsrf(req);
  if (response || !user) return response!;
  const u = user!;

  const rawBody = await readJson(req);
  if (!rawBody) return jsonError('Invalid JSON', 400, 'INVALID_JSON');
  const apptResult = updateAppointmentSchema.safeParse(rawBody);
  if (!apptResult.success) {
    const fields: Record<string, string> = {};
    for (const issue of apptResult.error.issues) {
      fields[String(issue.path.join('.') || 'body')] = issue.message;
    }
    return jsonError('Validation failed', 422, 'VALIDATION_ERROR', { fields });
  }
  const body = apptResult.data;
  const status = body.status;

  const appt = await db.appointment.findUnique({ where: { id: body.id } });
  if (!appt) return jsonError('Appointment not found', 404);

  // IDOR: only the patient, the doctor (owner of doctorId profile), or admin can update.
  const doctorProfile = await db.doctorProfile.findUnique({ where: { id: appt.doctorId } });
  const isPatient = appt.patientId === u.id;
  const isDoctor = doctorProfile?.userId === u.id;
  const isAdmin = u.role === 'admin';
  if (!isPatient && !isDoctor && !isAdmin) {
    return jsonError('Forbidden — you cannot modify this appointment', 403);
  }

  const updated = await db.appointment.update({
    where: { id: appt.id },
    data: {
      status: status === 'no-show' ? 'no_show' : status,
      notes: body.notes ? sanitizeText(body.notes, 1000) : undefined,
    },
  });

  await logAudit(u.id, 'appointment.update', `appt=${appt.id} status=${status}`);
  return jsonOk(updated);
}

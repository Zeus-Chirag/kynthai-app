import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, jsonError, jsonOk, readJson, checkConsent } from '@/lib/api-helpers';
import { logAudit } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/payouts — create a payout record (triggered when doctor/lab marks complete)
export async function POST(req: NextRequest) {
  const { response, user } = await requireAuth(req);
  if (response || !user) return response!;
  const consentErr = checkConsent(user);
  if (consentErr) return consentErr;

  const body = await readJson<{
    doctorId?: string;
    labId?: string;
    appointmentId?: string;
    labBookingId?: string;
    amount: number;
    commission: number;
  }>(req);
  if (!body) return jsonError('Invalid JSON', 400);

  if (body.appointmentId) {
    const appt = await db.appointment.findUnique({
      where: { id: body.appointmentId },
      include: { doctor: true },
    });
    if (!appt) return jsonError('Appointment not found', 404);
    if (appt.doctor.userId !== user.id && user.role !== 'admin') {
      return jsonError('Only the doctor or admin can create payouts', 403);
    }
    if (appt.status !== 'completed') {
      return jsonError('Appointment must be completed before payout', 400);
    }

    const commissionAmt = appt.commission || Math.round(appt.price * 0.15);
    const payout = await db.payout.create({
      data: {
        userId: appt.patientId,
        doctorId: appt.doctorId,
        appointmentId: appt.id,
        amount: appt.price,
        platformFee: commissionAmt,
        netAmount: appt.price - commissionAmt,
        status: 'processing',
      },
    });

    await logAudit(user.id, 'payout.create', `payout=${payout.id} amount=${body.amount}`);
    return jsonOk(payout, 201);
  }

  if (body.labBookingId) {
    const booking = await db.labBooking.findUnique({
      where: { id: body.labBookingId },
      include: { lab: true },
    });
    if (!booking) return jsonError('Lab booking not found', 404);
    if (booking.lab.userId !== user.id && user.role !== 'admin') {
      return jsonError('Only the lab or admin can create payouts', 403);
    }
    if (booking.status !== 'completed') {
      return jsonError('Lab booking must be completed before payout', 400);
    }

    // CRITICAL SECURITY: calculate amount server-side from verified booking price.
    // Never trust client-supplied amount or commission — labs could inflate arbitrarily.
    const serverAmount = booking.price - (booking.commission || Math.round(booking.price * 0.18));

    const commissionAmt = booking.commission || Math.round(booking.price * 0.18);
    const payout = await db.payout.create({
      data: {
        userId: booking.patientId,
        doctorId: booking.labId,
        appointmentId: booking.id,
        amount: booking.price,
        platformFee: commissionAmt,
        netAmount: booking.price - commissionAmt,
        status: 'processing',
      },
    });

    await logAudit(user.id, 'payout.create', `payout=${payout.id} amount=${body.amount}`);
    return jsonOk(payout, 201);
  }

  return jsonError('appointmentId or labBookingId required', 400);
}

// GET /api/payouts — list payouts for the current user
export async function GET(req: NextRequest) {
  const { response, user } = await requireAuth(req);
  if (response || !user) return response!;
  const consentErr = checkConsent(user);
  if (consentErr) return consentErr;

  let where: Record<string, unknown> = {};

  if (user.role === 'doctor') {
    const profile = await db.doctorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (profile) where.doctorId = profile.id;
  } else if (user.role === 'lab') {
    const profile = await db.labProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (profile) where.labId = profile.id;
  } else if (user.role === 'admin') {
    // Admin sees all
  } else {
    // Patients don't see payouts
    return jsonOk([]);
  }

  const payouts = await db.payout.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return jsonOk(payouts);
}

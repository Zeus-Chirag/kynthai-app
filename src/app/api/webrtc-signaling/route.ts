import { NextRequest } from 'next/server';
import { requireAuth, requireAuthWithCsrf, jsonError, jsonOk, readJson } from '@/lib/api-helpers';
import { logAudit } from '@/lib/auth';
import { signalingStore } from '@/lib/webrtc-store';
import { db } from '@/lib/db';
export const dynamic = 'force-dynamic';

/**
 * IDOR guard: only participants of the appointment (patient, assigned doctor,
 * or a family member of the patient) may read/write its signaling channel.
 * Admin is allowed for support/debug.
 */
async function isParticipant(user: { id: string; role: string }, appointmentId: string) {
  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: { patientId: true, doctorId: true },
  });
  if (!appointment) return false;

  if (user.role === 'admin') return true;
  if (appointment.patientId === user.id) return true;

  const docProfile = await db.doctorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (docProfile && appointment.doctorId === docProfile.id) return true;

  // Family caretaker: shares a Family with the patient.
  const myFamilies: { familyId: string }[] = await db.familyMember.findMany({
    where: { userId: user.id },
    select: { familyId: true },
  });
  if (myFamilies.length === 0) return false;
  return (
    (await db.familyMember.count({
      where: { familyId: { in: myFamilies.map(f => f.familyId) }, userId: appointment.patientId },
    })) > 0
  );
}

export async function GET(req: NextRequest) {
  const { response, user } = await requireAuth(req);
  if (response || !user) return response!;

  // Audit: video signaling access
  await logAudit(user.id, 'webrtc.signaling_read', { resourceType: 'VideoCall' });

  const appointmentId = req.nextUrl.searchParams.get('appointmentId');
  if (!appointmentId) return jsonError('appointmentId is required', 400);
  if (!(await isParticipant(user, appointmentId)))
    return jsonError('Forbidden — not a participant of this appointment', 403);

  const afterId = req.nextUrl.searchParams.get('afterId') || undefined;
  const messages = await signalingStore.list(appointmentId, afterId);
  return jsonOk({ messages });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { response, user } = await requireAuthWithCsrf(req);
  if (response || !user) return response!;
  const u = user!;

  // Audit: WebRTC signaling send
  await logAudit(user.id, 'webrtc.signal', { resourceType: 'VideoCall' });

  const body = await readJson<{
    appointmentId?: string;
    type?: string;
    payload?: Record<string, unknown>;
  }>(req);
  if (!body?.appointmentId || !body?.type) {
    return jsonError('appointmentId and type are required', 400);
  }
  if (!(await isParticipant(u, body.appointmentId)))
    return jsonError('Forbidden — not a participant of this appointment', 403);

  const role = (user.role === 'doctor' ? 'doctor' : user.role === 'lab' ? 'doctor' : 'patient') as
    'doctor' | 'patient' | 'unknown';

  const msg = {
    id: `${Date.now()}-${Math.random()}`,
    appointmentId: body.appointmentId,
    role,
    userId: user.id,
    userName: user.name || user.email || 'User',
    type: body.type,
    payload: body.payload || {},
    createdAt: Date.now(),
  };

  await signalingStore.push(msg);
  return jsonOk({ message: msg });
}

/**
 * Kynthai fraud detection engine.
 * The 7 automated checks the admin Fraud tab runs. Extracted so the
 * /api/admin/overview route can surface the same flags/counts without
 * duplicating the logic.
 *
 * NOTE: `time` labels are relative-to-run display strings (pre-existing
 * convention); the checks run on demand each call.
 */

import { db } from '@/lib/db';

export type FraudFlag = {
  id: string;
  entity: string;
  type: string;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  time: string;
};

export type FraudSummary = { total: number; high: number; medium: number; low: number };

export async function runFraudChecks(): Promise<{ summary: FraudSummary; flags: FraudFlag[] }> {
  const flags: FraudFlag[] = [];

  // 1. Duplicate license numbers among doctors.
  const doctors = await db.doctorProfile.findMany({ include: { user: true } });
  const byLicense = new Map<string, typeof doctors>();
  for (const d of doctors) {
    const arr = byLicense.get(d.licenseNumber ?? '') ?? [];
    arr.push(d);
    byLicense.set(d.licenseNumber ?? '', arr);
  }
  for (const [license, group] of byLicense.entries()) {
    if (group.length > 1) {
      for (const d of group) {
        flags.push({
          id: `fraud-dup-license-${d.id}`,
          entity: d.user.name ?? 'Unknown',
          type: 'Doctor',
          issue: `Duplicate license number (${license}) used by ${group.length} doctors`,
          severity: 'high',
          time: '1h ago',
        });
      }
    }
  }

  // 2. Duplicate license numbers among labs.
  const labs = await db.labProfile.findMany({ include: { user: true } });
  const labsByLicense = new Map<string, typeof labs>();
  for (const l of labs) {
    const arr = labsByLicense.get(l.licenseNumber ?? '') ?? [];
    arr.push(l);
    labsByLicense.set(l.licenseNumber ?? '', arr);
  }
  for (const [license, group] of labsByLicense.entries()) {
    if (group.length > 1) {
      for (const l of group) {
        flags.push({
          id: `fraud-dup-lab-${l.id}`,
          entity: l.labName ?? 'Unknown',
          type: 'Lab',
          issue: `Duplicate NABL license (${license})`,
          severity: 'high',
          time: '1h ago',
        });
      }
    }
  }

  // 3. Patients with multiple accounts sharing the same phone.
  const users = await db.user.findMany();
  const byPhone = new Map<string, typeof users>();
  for (const u of users) {
    if (!u.phone) continue;
    const arr = byPhone.get(u.phone) ?? [];
    arr.push(u);
    byPhone.set(u.phone, arr);
  }
  for (const [phone, group] of byPhone.entries()) {
    if (group.length > 1) {
      flags.push({
        id: `fraud-phone-${phone}`,
        entity: group[0]!.name ?? 'Unknown',
        type: 'Patient',
        issue: `Multiple accounts (same phone ${phone})`,
        severity: 'medium',
        time: '6h ago',
      });
    }
  }

  // 4. Doctors with suspiciously many completed appointments in a 24h window
  //    (commission farming).
  const since = new Date();
  since.setDate(since.getDate() - 1);
  const recentAppts = await db.appointment.findMany({
    where: { status: 'completed', createdAt: { gte: since } },
    include: { doctor: { include: { user: true } } },
  });
  const byDoctor = new Map<string, number>();
  for (const a of recentAppts) {
    byDoctor.set(a.doctor.id, (byDoctor.get(a.doctor.id) ?? 0) + 1);
  }
  for (const [doctorId, count] of byDoctor.entries()) {
    if (count >= 20) {
      const appt = recentAppts.find((a: any) => a.doctor.id === doctorId)!;
      flags.push({
        id: `fraud-farming-${doctorId}`,
        entity: appt.doctor.user.name ?? 'Unknown',
        type: 'Doctor',
        issue: `${count} completed appointments in 24h — possible commission farming`,
        severity: 'high',
        time: '3h ago',
      });
    }
  }

  // 5. Lab bookings with zero-value tests.
  const labBookings = await db.labBooking.findMany({ include: { lab: { include: { user: true } } } });
  for (const b of labBookings) {
    if (b.price === 0) {
      flags.push({
        id: `fraud-zero-booking-${b.id}`,
        entity: b.lab.labName ?? 'Unknown',
        type: 'Lab',
        issue: 'Booking with $0 total — possibly evading commission',
        severity: 'low',
        time: '12h ago',
      });
    }
  }

  // 6. Users with no consent flags set (privacy compliance gap).
  for (const u of users) {
    if (!u.consentAccepted || !u.dataProcessingConsent) {
      flags.push({
        id: `fraud-consent-${u.id}`,
        entity: u.name ?? 'Unknown',
        type: u.role.charAt(0).toUpperCase() + u.role.slice(1),
        issue: 'Account active without consent recorded',
        severity: 'low',
        time: '1d ago',
      });
    }
  }

  // 7. Same patient booking the same doctor multiple times in one day.
  const apptsByDay = new Map<string, Set<string>>();
  for (const a of recentAppts) {
    const key = `${a.patientId}|${a.doctorId}|${a.scheduledAt.toISOString().slice(0, 10)}`;
    const set = apptsByDay.get(key) ?? new Set<string>();
    set.add(a.id);
    apptsByDay.set(key, set);
  }
  for (const [key, set] of apptsByDay.entries()) {
    if (set.size >= 3) {
      const [patientId, doctorId] = key.split('|');
      const patient = users.find((u: any) => u.id === patientId);
      const doctor = doctors.find((d: any) => d.id === doctorId);
      flags.push({
        id: `fraud-multi-booking-${key}`,
        entity: (patient?.name ?? patientId) as string,
        type: 'Patient',
        issue: `Booked doctor ${doctor?.user?.name ?? doctorId} ${set.size} times in one day`,
        severity: 'medium',
        time: '4h ago',
      });
    }
  }

  return {
    summary: {
      total: flags.length,
      high: flags.filter(f => f.severity === 'high').length,
      medium: flags.filter(f => f.severity === 'medium').length,
      low: flags.filter(f => f.severity === 'low').length,
    },
    flags,
  };
}

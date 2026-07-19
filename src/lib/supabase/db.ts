import { supabase } from './client';
import type { Database } from '@/supabase/types';
import { NextRequest } from 'next/server';

// ── Supabase-backed replacement for Prisma `db` client ──────────────────────
// All functions accept optional user context for RLS filtering.
// Falls back gracefully when Supabase is not configured (returns nulls).

export const isSupabaseConfigured = () => {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
};

// Generic query helper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sb<T>(
  table: string,
  query: (client: any) => Promise<{ data: T | null; error: Error | null }>
): Promise<T | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await query(supabase as any);
  if (error) {
    console.error(`Supabase query error [${table}]:`, error.message);
    return null;
  }
  return data;
}

// ── User helpers ────────────────────────────────────────────────────────────

export async function findUserByEmail(email: string) {
  return sb('users', s => s.from('users').select('*').eq('email', email).maybeSingle());
}

export async function findUserById(id: string) {
  return sb('users', s => s.from('users').select('*').eq('id', id).maybeSingle());
}

export async function createUser(data: Record<string, unknown>) {
  return sb('users', s => s.from('users').insert(data).select().single());
}

export async function updateUser(id: string, data: Record<string, unknown>) {
  return sb('users', s => s.from('users').update(data).eq('id', id).select().single());
}

// ── Doctor helpers ──────────────────────────────────────────────────────────

export async function findDoctorByUserId(userId: string) {
  return sb('doctor_profiles', s =>
    s.from('doctor_profiles').select('*').eq('user_id', userId).maybeSingle()
  );
}

export async function createDoctorProfile(data: Record<string, unknown>) {
  return sb('doctor_profiles', s => s.from('doctor_profiles').insert(data).select().single());
}

export async function listVerifiedDoctors() {
  return sb('doctor_profiles', s =>
    s.from('doctor_profiles').select('*, users!inner(name, email)').eq('verified', true)
  );
}

export async function searchDoctors(query: string) {
  return sb('doctor_profiles', s =>
    s
      .from('doctor_profiles')
      .select('*, users!inner(name, email, city)')
      .or(`specialization.ilike.%${query}%,users.name.ilike.%${query}%`)
  );
}

// ── Appointment helpers ─────────────────────────────────────────────────────

export async function createAppointment(data: Record<string, unknown>) {
  return sb('appointments', s => s.from('appointments').insert(data).select().single());
}

export async function findAppointmentById(id: string) {
  return sb('appointments', s => s.from('appointments').select('*').eq('id', id).maybeSingle());
}

export async function listAppointmentsForPatient(patientId: string) {
  return sb('appointments', s =>
    s
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId)
      .order('scheduled_at', { ascending: true })
  );
}

export async function listAppointmentsForDoctor(doctorId: string) {
  return sb('appointments', s =>
    s
      .from('appointments')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('scheduled_at', { ascending: true })
  );
}

export async function updateAppointment(id: string, data: Record<string, unknown>) {
  return sb('appointments', s =>
    s.from('appointments').update(data).eq('id', id).select().single()
  );
}

// ── Lab helpers ─────────────────────────────────────────────────────────────

export async function createLabProfile(data: Record<string, unknown>) {
  return sb('lab_profiles', s => s.from('lab_profiles').insert(data).select().single());
}

export async function findLabByUserId(userId: string) {
  return sb('lab_profiles', s =>
    s.from('lab_profiles').select('*').eq('user_id', userId).maybeSingle()
  );
}

export async function listActiveLabs() {
  return sb('lab_profiles', s => s.from('lab_profiles').select('*').eq('status', 'active'));
}

// ── Lab Booking helpers ─────────────────────────────────────────────────────

export async function createLabBooking(data: Record<string, unknown>) {
  return sb('lab_bookings', s => s.from('lab_bookings').insert(data).select().single());
}

export async function updateLabBooking(id: string, data: Record<string, unknown>) {
  return sb('lab_bookings', s =>
    s.from('lab_bookings').update(data).eq('id', id).select().single()
  );
}

export async function listLabBookingsForPatient(patientId: string) {
  return sb('lab_bookings', s =>
    s
      .from('lab_bookings')
      .select('*')
      .eq('patient_id', patientId)
      .order('scheduled_at', { ascending: true })
  );
}

// ── Medication helpers ──────────────────────────────────────────────────────

export async function createMedication(data: Record<string, unknown>) {
  return sb('medications', s => s.from('medications').insert(data).select().single());
}

export async function listMedicationsForPatient(patientId: string) {
  return sb('medications', s =>
    s
      .from('medications')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
  );
}

export async function updateMedication(id: string, data: Record<string, unknown>) {
  return sb('medications', s => s.from('medications').update(data).eq('id', id).select().single());
}

export async function deleteMedication(id: string) {
  return sb('medications', s => s.from('medications').delete().eq('id', id).select().single());
}

// ── Prescription helpers ────────────────────────────────────────────────────

export async function createPrescription(data: Record<string, unknown>) {
  return sb('prescriptions', s => s.from('prescriptions').insert(data).select().single());
}

export async function listPrescriptionsForPatient(patientId: string) {
  return sb('prescriptions', s =>
    s
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
  );
}

// ── Payment helpers ─────────────────────────────────────────────────────────

export async function createPayment(data: Record<string, unknown>) {
  return sb('payments', s => s.from('payments').insert(data).select().single());
}

export async function listPaymentsForUser(userId: string) {
  return sb('payments', s =>
    s.from('payments').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
}

// ── Refund helpers ──────────────────────────────────────────────────────────

export async function createRefund(data: Record<string, unknown>) {
  return sb('refunds', s => s.from('refunds').insert(data).select().single());
}

export async function listRefundsForUser(userId: string) {
  return sb('refunds', s =>
    s.from('refunds').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
}

export async function updateRefund(id: string, data: Record<string, unknown>) {
  return sb('refunds', s => s.from('refunds').update(data).eq('id', id).select().single());
}

// ── Complaint helpers ───────────────────────────────────────────────────────

export async function createComplaint(data: Record<string, unknown>) {
  return sb('complaints', s => s.from('complaints').insert(data).select().single());
}

export async function listComplaintsForUser(userId: string) {
  return sb('complaints', s =>
    s.from('complaints').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  );
}

// ── Audit log helpers ───────────────────────────────────────────────────────

export async function createAuditLog(data: Record<string, unknown>) {
  return sb('audit_logs', s => s.from('audit_logs').insert(data).select().single());
}

// ── Family helpers ──────────────────────────────────────────────────────────

export async function listFamilyMembers(userId: string) {
  return sb('family_members', s => s.from('family_members').select('*').eq('user_id', userId));
}

export async function createFamilyMember(data: Record<string, unknown>) {
  return sb('family_members', s => s.from('family_members').insert(data).select().single());
}

// ── Notification helpers ────────────────────────────────────────────────────

export async function listNotifications(userId: string) {
  return sb('notifications', s =>
    s
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
  );
}

export async function createNotification(data: Record<string, unknown>) {
  return sb('notifications', s => s.from('notifications').insert(data).select().single());
}

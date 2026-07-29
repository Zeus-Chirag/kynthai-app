import { supabase } from './client';
import { getSupabaseServer } from './server';
import type { Database } from '@/supabase/types';
import type { AuthUser } from '@/lib/store';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Type aliases for the users table
type UsersInsert = Database['public']['Tables']['users']['Insert'];
type UsersRow = Database['public']['Tables']['users']['Row'];

// Typed query wrappers — bypass PostgrestBuilder inference issues by going
// through `any` at the helper boundary; the type aliases above still provide
// payload-level type safety at each call site.
const sbUsers = () => (supabase as any).from('users');
const sbInsertUsers = (payload: UsersInsert) => sbUsers().insert(payload) as any;
const sbSelectUsersById = (userId: string) =>
  sbUsers().select('*').eq('id', userId).single() as any;

// ── Registration ────────────────────────────────────────────────────────────

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role: 'patient' | 'doctor' | 'lab' | 'admin' | 'caretaker';
  phone?: string;
  dateOfBirth?: string;
  emergencyContact1?: string;
  emergencyContact2?: string;
  consentFlags: {
    dataProcessing: boolean;
    termsOfService: boolean;
    hipaa: boolean;
    aiTraining: boolean;
  };
}

export async function registerUser(input: RegisterInput) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        name: input.name,
        role: input.role,
      },
    },
  });

  if (authError || !authData.user) {
    return { error: authError?.message || 'Registration failed' };
  }

  const { error: profileError } = await sbInsertUsers({
    id: authData.user.id,
    email: input.email,
    name: input.name,
    role: input.role,
    phone: input.phone || null,
    date_of_birth: input.dateOfBirth || null,
    emergency_contact_1: input.emergencyContact1 || null,
    emergency_contact_2: input.emergencyContact2 || null,
    data_processing_consent: input.consentFlags.dataProcessing,
    terms_of_service_consent: input.consentFlags.termsOfService,
    hipaa_consent: input.consentFlags.hipaa,
    ai_training_consent: input.consentFlags.aiTraining,
    registered_at: new Date().toISOString(),
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
    return { error: `Profile creation failed: ${profileError.message}` };
  }

  return {
    user: {
      id: authData.user.id,
      email: input.email,
      name: input.name,
      role: input.role,
    },
  };
}

// ── Login ───────────────────────────────────────────────────────────────────

export async function loginWithSupabase(email: string, password: string) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message || 'Invalid credentials' };
  }

  const profileResult = await sbSelectUsersById(data.user.id);
  if (!profileResult || !profileResult.data) {
    return { error: 'User profile not found' };
  }

  const p = profileResult.data as UsersRow;

  const user: AuthUser = {
    id: data.user.id,
    email: data.user.email || email,
    name: p.name,
    role: p.role as AuthUser['role'],
  };

  return { user };
}

// ── Session management ──────────────────────────────────────────────────────

export async function getCurrentUser() {
  if (!supabase) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return null;

  const profileResult = await sbSelectUsersById(session.user.id);
  if (!profileResult || !profileResult.data) return null;

  const profile = profileResult.data as UsersRow;

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role as AuthUser['role'],
  } as AuthUser;
}

export async function logoutSupabase() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// ── Server-side auth (for API routes) ───────────────────────────────────────

export async function requireAuthSupabase(req: NextRequest) {
  const sb = await getSupabaseServer();
  const session = await sb.auth.getSession();

  if (!session.data.session?.user) {
    return {
      response: new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  const user = session.data.session.user;

  return { user, supabase: sb };
}

// ── Password reset ──────────────────────────────────────────────────────────

export async function requestPasswordReset(email: string) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  return { error: error?.message || null };
}

export async function updatePassword(newPassword: string) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  return { error: error?.message || null };
}

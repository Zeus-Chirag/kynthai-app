-- ==========================================================================
-- Kynthai US — Supabase SQL Schema
-- Migration: 001_initial_schema
-- ==========================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ==========================================================================
-- ENUMS
-- ==========================================================================

create type user_role as enum ('patient', 'doctor', 'lab', 'admin', 'caretaker');
create type appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
create type refund_status as enum ('pending', 'processing', 'completed', 'rejected', 'failed');
create type complaint_priority as enum ('low', 'medium', 'high', 'critical');
create type complaint_status as enum ('open', 'investigating', 'resolved', 'closed');
create type payout_status as enum ('pending', 'processing', 'completed', 'failed');

-- ==========================================================================
-- USERS (extends auth.users)
-- ==========================================================================

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role user_role not null default 'patient',
  phone text,
  date_of_birth text,
  emergency_contact_1 text,
  emergency_contact_2 text,
  data_processing_consent boolean not null default false,
  terms_of_service_consent boolean not null default false,
  hipaa_consent boolean not null default false,
  ai_training_consent boolean not null default false,
  verified boolean not null default false,
  is_demo boolean not null default false,
  registered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_role on public.users(role);

alter table public.users enable row level security;

create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

create policy "Service role has full access" on public.users
  for all using (auth.role() = 'service_role');

-- ==========================================================================
-- DOCTOR PROFILES
-- ==========================================================================

create table if not exists public.doctor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  specialization text not null,
  license_number text not null,
  experience integer not null default 0,
  consultation_fee integer not null default 0,
  city text not null,
  bio text,
  video_call_enabled boolean not null default true,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_doctor_profiles_user on public.doctor_profiles(user_id);
create index if not exists idx_doctor_profiles_city on public.doctor_profiles(city);

alter table public.doctor_profiles enable row level security;

create policy "Doctors view own profile" on public.doctor_profiles
  for select using (auth.uid() = user_id);

create policy "Doctors update own profile" on public.doctor_profiles
  for update using (auth.uid() = user_id);

create policy "Patients can view verified doctors" on public.doctor_profiles
  for select using (verified = true);

create policy "Service role full access" on public.doctor_profiles
  for all using (auth.role() = 'service_role');

-- ==========================================================================
-- LAB PROFILES
-- ==========================================================================

create table if not exists public.lab_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  lab_name text not null,
  license_number text not null,
  city text not null,
  address text,
  home_collection boolean not null default true,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lab_profiles_user on public.lab_profiles(user_id);
create index if not exists idx_lab_profiles_city on public.lab_profiles(city);

alter table public.lab_profiles enable row level security;

create policy "Labs manage own profile" on public.lab_profiles
  for all using (auth.uid() = user_id);

create policy "Patients view active labs" on public.lab_profiles
  for select using (status = 'active');

create policy "Service role full access" on public.lab_profiles
  for all using (auth.role() = 'service_role');

-- ==========================================================================
-- FAMILY MEMBERS
-- ==========================================================================

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  relation text not null,
  email text,
  phone text,
  age integer not null default 0,
  adherence integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_family_members_user on public.family_members(user_id);

alter table public.family_members enable row level security;

create policy "Family caretakers manage members" on public.family_members
  for all using (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'caretaker'
    )
  );

create policy "Service role full access" on public.family_members
  for all using (auth.role() = 'service_role');

-- ==========================================================================
-- MEDICATIONS
-- ==========================================================================

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  dosage text not null,
  frequency text not null,
  instructions text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_medications_patient on public.medications(patient_id);

alter table public.medications enable row level security;

create policy "Patients manage own medications" on public.medications
  for all using (
    auth.uid() = patient_id
    or exists (
      select 1 from public.users where id = auth.uid() and role in ('caretaker')
    )
  );

create policy "Service role full access" on public.medications
  for all using (auth.role() = 'service_role');

-- ==========================================================================
-- APPOINTMENTS
-- ==========================================================================

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  doctor_id uuid not null references public.doctor_profiles(id) on delete cascade,
  status appointment_status not null default 'pending',
  scheduled_at timestamptz not null,
  type text not null default 'video',
  price integer not null default 0,
  commission integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_appointments_patient on public.appointments(patient_id);
create index if not exists idx_appointments_doctor on public.appointments(doctor_id);
create index if not exists idx_appointments_status on public.appointments(status);

alter table public.appointments enable row level security;

create policy "Patients view own appointments" on public.appointments
  for select using (auth.uid() = patient_id);

create policy "Doctors view assigned appointments" on public.appointments
  for select using (
    exists (
      select 1 from public.doctor_profiles where id = doctor_id and user_id = auth.uid()
    )
  );

create policy "Patients create appointments" on public.appointments
  for insert with check (auth.uid() = patient_id);

create policy "Doctors update appointments" on public.appointments
  for update using (
    exists (
      select 1 from public.doctor_profiles where id = doctor_id and user_id = auth.uid()
    )
  );

create policy "Service role full access" on public.appointments
  for all using (auth.role() = 'service_role');

-- ==========================================================================
-- LAB BOOKINGS
-- ==========================================================================

create table if not exists public.lab_bookings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  lab_id uuid not null references public.lab_profiles(id) on delete cascade,
  lab_name text not null,
  tests text not null default '[]',
  price integer not null default 0,
  commission integer not null default 0,
  status text not null default 'pending',
  scheduled_at timestamptz not null default now(),
  home_collection boolean not null default true,
  travel_fee integer,
  notes text,
  results_file text,
  results_note text,
  result_uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lab_bookings_patient on public.lab_bookings(patient_id);
create index if not exists idx_lab_bookings_lab on public.lab_bookings(lab_id);

alter table public.lab_bookings enable row level security;

create policy "Patients view own lab bookings" on public.lab_bookings
  for select using (auth.uid() = patient_id);

create policy "Labs view own bookings" on public.lab_bookings
  for select using (
    exists (
      select 1 from public.lab_profiles where id = lab_id and user_id = auth.uid()
    )
  );

create policy "Patients create bookings" on public.lab_bookings
  for insert with check (auth.uid() = patient_id);

create policy "Labs update bookings" on public.lab_bookings
  for update using (
    exists (
      select 1 from public.lab_profiles where id = lab_id and user_id = auth.uid()
    )
  );

create policy "Service role full access" on public.lab_bookings
  for all using (auth.role() = 'service_role');

-- ==========================================================================
-- PRESCRIPTIONS
-- ==========================================================================

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  doctor_id uuid not null references public.doctor_profiles(id) on delete cascade,
  medications text not null default '[]',
  follow_up_date timestamptz,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_prescriptions_patient on public.prescriptions(patient_id);
create index if not exists idx_prescriptions_doctor on public.prescriptions(doctor_id);

alter table public.prescriptions enable row level security;

create policy "Patients view own prescriptions" on public.prescriptions
  for select using (auth.uid() = patient_id);

create policy "Doctors view own prescriptions" on public.prescriptions
  for select using (
    exists (
      select 1 from public.doctor_profiles where id = doctor_id and user_id = auth.uid()
    )
  );

create policy "Doctors create prescriptions" on public.prescriptions
  for insert with check (
    exists (
      select 1 from public.doctor_profiles where id = doctor_id and user_id = auth.uid()
    )
  );

create policy "Service role full access" on public.prescriptions
  for all using (auth.role() = 'service_role');

-- ==========================================================================
-- PAYMENTS
-- ==========================================================================

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount integer not null default 0,
  currency text not null default 'USD',
  type text not null,
  status text not null default 'pending',
  provider text not null default 'mock',
  provider_ref text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_user on public.payments(user_id);
create index if not exists idx_payments_status on public.payments(status);

alter table public.payments enable row level security;

create policy "Users view own payments" on public.payments
  for select using (auth.uid() = user_id);

create policy "Service role full access" on public.payments
  for all using (auth.role() = 'service_role');

-- ==========================================================================
-- REFUNDS
-- ==========================================================================

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  lab_booking_id uuid references public.lab_bookings(id) on delete set null,
  payment_id uuid not null,
  amount integer not null default 0,
  reason text not null,
  status refund_status not null default 'pending',
  requested_by text not null,
  proof_file text,
  proof_note text,
  review_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_refunds_user on public.refunds(user_id);
create index if not exists idx_refunds_status on public.refunds(status);

alter table public.refunds enable row level security;

create policy "Patients view own refunds" on public.refunds
  for select using (auth.uid() = user_id);

create policy "Service role full access" on public.refunds
  for all using (auth.role() = 'service_role');

-- ==========================================================================
-- COMPLAINTS
-- ==========================================================================

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  category text not null,
  subject text not null,
  priority complaint_priority not null default 'medium',
  status complaint_status not null default 'open',
  related_entity_type text,
  related_entity_id uuid,
  proof_file text,
  evidence_note text,
  admin_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_complaints_user on public.complaints(user_id);
create index if not exists idx_complaints_status on public.complaints(status);
create index if not exists idx_complaints_category on public.complaints(category);

alter table public.complaints enable row level security;

create policy "Users view own complaints" on public.complaints
  for select using (auth.uid() = user_id);

create policy "Users create complaints" on public.complaints
  for insert with check (auth.uid() = user_id);

create policy "Users update own complaints" on public.complaints
  for update using (auth.uid() = user_id);

create policy "Admins view all complaints" on public.complaints
  for all using (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

create policy "Service role full access" on public.complaints
  for all using (auth.role() = 'service_role');

-- ==========================================================================
-- NOTIFICATIONS
-- ==========================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null,
  data text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(read);

alter table public.notifications enable row level security;

create policy "Users view own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Users update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

create policy "Service role full access" on public.notifications
  for all using (auth.role() = 'service_role');

-- ==========================================================================
-- AUDIT LOGS
-- ==========================================================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  action text not null,
  category text not null,
  details text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_user on public.audit_logs(user_id);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at);

alter table public.audit_logs enable row level security;

create policy "Users view own audit logs" on public.audit_logs
  for select using (auth.uid() = user_id);

create policy "Admins view all audit logs" on public.audit_logs
  for select using (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

create policy "Service role full access" on public.audit_logs
  for all using (auth.role() = 'service_role');

-- ==========================================================================
-- PAYOUTS
-- ==========================================================================

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references public.doctor_profiles(id) on delete set null,
  lab_id uuid references public.lab_profiles(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  lab_booking_id uuid references public.lab_bookings(id) on delete set null,
  amount integer not null default 0,
  currency text not null default 'USD',
  commission integer not null default 0,
  status payout_status not null default 'pending',
  paid_at timestamptz,
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payouts_doctor on public.payouts(doctor_id);
create index if not exists idx_payouts_lab on public.payouts(lab_id);
create index if not exists idx_payouts_status on public.payouts(status);

alter table public.payouts enable row level security;

create policy "Doctors view own payouts" on public.payouts
  for select using (
    exists (
      select 1 from public.doctor_profiles where id = doctor_id and user_id = auth.uid()
    )
  );

create policy "Labs view own payouts" on public.payouts
  for select using (
    exists (
      select 1 from public.lab_profiles where id = lab_id and user_id = auth.uid()
    )
  );

create policy "Service role full access" on public.payouts
  for all using (auth.role() = 'service_role');

-- ==========================================================================
-- LAB TESTS
-- ==========================================================================

create table if not exists public.lab_tests (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.lab_profiles(id) on delete cascade,
  name text not null,
  price integer not null default 0,
  category text,
  created_at timestamptz not null default now()
);

create index if not exists idx_lab_tests_lab on public.lab_tests(lab_id);

alter table public.lab_tests enable row level security;

create policy "Labs manage own tests" on public.lab_tests
  for all using (
    exists (
      select 1 from public.lab_profiles where id = lab_id and user_id = auth.uid()
    )
  );

create policy "Patients view all lab tests" on public.lab_tests
  for select using (true);

create policy "Service role full access" on public.lab_tests
  for all using (auth.role() = 'service_role');

-- ==========================================================================
-- TRIGGERS — auto-update updated_at
-- ==========================================================================

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated_at before update on public.users
  for each row execute function public.update_updated_at();

create trigger trg_doctor_profiles_updated_at before update on public.doctor_profiles
  for each row execute function public.update_updated_at();

create trigger trg_lab_profiles_updated_at before update on public.lab_profiles
  for each row execute function public.update_updated_at();

create trigger trg_appointments_updated_at before update on public.appointments
  for each row execute function public.update_updated_at();

create trigger trg_lab_bookings_updated_at before update on public.lab_bookings
  for each row execute function public.update_updated_at();

create trigger trg_medications_updated_at before update on public.medications
  for each row execute function public.update_updated_at();

create trigger trg_prescriptions_updated_at before update on public.prescriptions
  for each row execute function public.update_updated_at();

create trigger trg_payments_updated_at before update on public.payments
  for each row execute function public.update_updated_at();

create trigger trg_refunds_updated_at before update on public.refunds
  for each row execute function public.update_updated_at();

create trigger trg_complaints_updated_at before update on public.complaints
  for each row execute function public.update_updated_at();

-- ==========================================================================
-- STORAGE BUCKETS
-- ==========================================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

create policy "Authenticated users can upload" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
  );

create policy "Users can view own files" on storage.objects
  for select using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Service role has full access" on storage.objects
  for all using (
    bucket_id = 'documents'
    and auth.role() = 'service_role'
  );

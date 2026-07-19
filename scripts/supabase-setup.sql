-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SUPABASE SETUP - Run this in Supabase SQL Editor                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- 1. Create Storage Buckets (run in SQL Editor after enabling storage extension)
-- These are typically created via dashboard, but included for reference

-- 2. Enable Row Level Security (RLS) for all tables
-- The migration file already has this, but run these if needed:

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- 3. Basic RLS Policies (customize for your security needs)

-- Users can view their own data
CREATE POLICY "users_self_rls" ON users FOR ALL USING (auth.uid()::text = id);

-- Doctors can view their own profile
CREATE POLICY "doctor_profiles_self_rls" ON doctor_profiles FOR ALL USING (auth.uid()::text = user_id);

-- Patients can view their own appointments
CREATE POLICY "appointments_patient_rls" ON appointments FOR ALL USING (auth.uid()::text = patient_id);

-- Doctors can view appointments they're assigned to
CREATE POLICY "appointments_doctor_rls" ON appointments FOR ALL USING (auth.uid()::text = doctor_id);

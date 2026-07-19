-- ============================================================================
-- Kyntha US Health Platform — Supabase PostgreSQL Migration
-- Migrated from Prisma/SQLite schema
-- ============================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ── Custom Types ────────────────────────────────────────────────────────────
CREATE TYPE "UserRole" AS ENUM ('patient', 'doctor', 'lab', 'caretaker', 'admin');
CREATE TYPE "AppointmentStatus" AS ENUM ('pending', 'awaiting_payment', 'confirmed', 'completed', 'cancelled');
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'succeeded', 'failed', 'refunded');
CREATE TYPE "ReminderStatus" AS ENUM ('pending', 'taken', 'missed', 'skipped');
CREATE TYPE "ChatMessageRole" AS ENUM ('user', 'assistant', 'system');
CREATE TYPE "SubscriptionTier" AS ENUM ('free', 'plus', 'pro', 'family_pro');
CREATE TYPE "RefundStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'rejected');
CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ── Enums end ────────────────────────────────────────────────────────────

-- ============================================================================
-- USERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email                 TEXT UNIQUE NOT NULL,
  name                  TEXT,
  name_enc              TEXT,
  role                  "UserRole" DEFAULT 'patient',
  phone                 TEXT,
  phone_enc             TEXT,
  password              TEXT,
  "emailVerified"       BOOLEAN DEFAULT false,
  "subscriptionTier"    "SubscriptionTier" DEFAULT 'free',
  "stripeCustomerId"    TEXT UNIQUE,
  "sessionToken"        TEXT,
  "sessionExpiry"       TIMESTAMPTZ,
  "consentAccepted"     BOOLEAN DEFAULT false,
  "dataProcessingConsent" BOOLEAN DEFAULT false,
  "aiTrainingConsent"   BOOLEAN DEFAULT false,
  "notificationPrefs"   TEXT,
  "emailOptOut"         BOOLEAN DEFAULT false,
  "isDemo"              BOOLEAN DEFAULT false,
  "failedLoginAttempts" INTEGER DEFAULT 0,
  "lockedUntil"         TIMESTAMPTZ,
  "dateOfBirth"         TIMESTAMPTZ,
  "dateOfBirth_enc"     TEXT,
  allergies             TEXT,
  allergies_enc         TEXT,
  "passwordResetToken"  TEXT,
  "passwordResetToken_enc" TEXT,
  "passwordResetExpires" TIMESTAMPTZ,
  "emailVerificationToken" TEXT,
  "emailVerificationToken_enc" TEXT,
  "emailVerificationExpires" TIMESTAMPTZ,
  "createdAt"           TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"           TIMESTAMPTZ DEFAULT now() NOT NULL,
  "deletedAt"           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users("createdAt");

-- ── updatedAt trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- DOCTOR PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_profiles (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"          TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  specialization    TEXT NOT NULL,
  "licenseNumber"   TEXT,
  "licenseNumber_enc" TEXT,
  experience        INTEGER DEFAULT 0,
  "consultationFee" INTEGER DEFAULT 100,
  "videoCallEnabled" BOOLEAN DEFAULT false,
  verified          BOOLEAN DEFAULT false,
  bio               TEXT,
  bio_enc           TEXT,
  rating            REAL DEFAULT 4.5,
  "reviewCount"     INTEGER DEFAULT 0,
  documents         TEXT DEFAULT '[]',
  "avatarColor"     TEXT DEFAULT 'emerald',
  city              TEXT DEFAULT '',
  "subscriptionTier" TEXT DEFAULT 'free',
  "subscriptionRenews" TIMESTAMPTZ,
  "patientSlotCap"  INTEGER DEFAULT 5,
  "verificationStatus" TEXT DEFAULT 'pending',
  "rejectionReason" TEXT,
  "rejectionReason_enc" TEXT,
  "npiNumber"       TEXT,
  "submittedAt"     TIMESTAMPTZ,
  ssn               TEXT,
  ssn_enc           TEXT,
  "taxId"           TEXT,
  "taxId_enc"       TEXT,
  "degreeType"      TEXT,
  "degreeType_enc"  TEXT,
  "medicalCouncil"  TEXT,
  "medicalCouncil_enc" TEXT,
  "createdAt"       TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"       TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_doctor_profiles_user_id ON doctor_profiles("userId");
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_verified ON doctor_profiles(verified);

CREATE TRIGGER doctor_profiles_updated_at BEFORE UPDATE ON doctor_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- LAB PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS lab_profiles (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"       TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "labName"      TEXT,
  "labName_enc"  TEXT,
  "licenseNumber" TEXT,
  "licenseNumber_enc" TEXT,
  address        TEXT,
  address_enc    TEXT,
  "testsOffered" TEXT DEFAULT '[]',
  verified       BOOLEAN DEFAULT false,
  rating         REAL DEFAULT 4.5,
  "reviewCount"  INTEGER DEFAULT 0,
  documents      TEXT DEFAULT '[]',
  "homeCollection" BOOLEAN DEFAULT true,
  city           TEXT DEFAULT '',
  "verificationStatus" TEXT DEFAULT 'pending',
  "rejectionReason" TEXT,
  "rejectionReason_enc" TEXT,
  "submittedAt"  TIMESTAMPTZ,
  "createdAt"    TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lab_profiles_user_id ON lab_profiles("userId");

CREATE TRIGGER lab_profiles_updated_at BEFORE UPDATE ON lab_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- APPOINTMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointments (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "doctorId"      TEXT NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  "patientId"     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "scheduledAt"   TIMESTAMPTZ NOT NULL,
  "durationMinutes" INTEGER DEFAULT 15,
  type            TEXT DEFAULT 'video',
  status          "AppointmentStatus" DEFAULT 'pending',
  price           INTEGER DEFAULT 0,
  commission      INTEGER DEFAULT 0,
  "paymentCaptured" BOOLEAN DEFAULT false,
  reason          TEXT,
  reason_enc      TEXT,
  notes           TEXT,
  notes_enc       TEXT,
  "deletedAt"     TIMESTAMPTZ,
  "createdAt"     TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"     TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments("patientId");
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments("doctorId");
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments("scheduledAt");

CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- LAB BOOKINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS lab_bookings (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "labId"        TEXT NOT NULL REFERENCES lab_profiles(id) ON DELETE CASCADE,
  "patientId"    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tests          TEXT DEFAULT '[]',
  "scheduledAt"  TIMESTAMPTZ NOT NULL,
  status         TEXT DEFAULT 'pending',
  price          INTEGER DEFAULT 0,
  commission     INTEGER DEFAULT 0,
  "homeCollection" BOOLEAN DEFAULT true,
  "travelFee"    INTEGER DEFAULT 0,
  notes          TEXT,
  notes_enc      TEXT,
  "resultsFile"  TEXT,
  "resultsNote"  TEXT,
  "resultsNote_enc" TEXT,
  "resultUploadedAt" TIMESTAMPTZ,
  "createdAt"    TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lab_bookings_lab_id ON lab_bookings("labId");
CREATE INDEX IF NOT EXISTS idx_lab_bookings_patient_id ON lab_bookings("patientId");
CREATE INDEX IF NOT EXISTS idx_lab_bookings_status ON lab_bookings(status);

CREATE TRIGGER lab_bookings_updated_at BEFORE UPDATE ON lab_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- DOCTOR AVAILABILITY SLOTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_availability_slots (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "doctorId" TEXT NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  day       TEXT NOT NULL,  -- monday-sunday
  start     TEXT NOT NULL,  -- HH:MM
  "end"     TEXT NOT NULL,  -- HH:MM
  active    BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_doctor_availability_slots_doctor ON doctor_availability_slots("doctorId");

CREATE TRIGGER doctor_availability_slots_updated_at BEFORE UPDATE ON doctor_availability_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- CONSULT MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS consult_messages (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "appointmentId" TEXT REFERENCES appointments(id) ON DELETE CASCADE,
  "doctorId"    TEXT REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  "senderId"    TEXT NOT NULL,
  "senderRole"  TEXT NOT NULL,  -- doctor | patient
  content       TEXT,
  content_enc   TEXT,
  "read"        BOOLEAN DEFAULT false,
  "deletedAt"   TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_consult_messages_appt ON consult_messages("appointmentId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_consult_messages_doctor ON consult_messages("doctorId", "createdAt");

CREATE TRIGGER consult_messages_updated_at BEFORE UPDATE ON consult_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- MEDICINE ORDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS medicine_orders (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "patientId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  items       TEXT DEFAULT '[]',
  items_enc   TEXT,
  "totalAmount" INTEGER DEFAULT 0,
  status      TEXT DEFAULT 'pending',
  address     TEXT DEFAULT '',
  address_enc TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_medicine_orders_patient ON medicine_orders("patientId");

-- ============================================================================
-- CHRONIC CONDITIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS chronic_conditions (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "patientId"   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT,
  name_enc      TEXT,
  "diagnosedDate" TEXT,
  "diagnosedDate_enc" TEXT,
  severity      TEXT DEFAULT 'mild',
  medications   TEXT DEFAULT '[]',
  medications_enc TEXT,
  notes         TEXT,
  notes_enc     TEXT,
  active        BOOLEAN DEFAULT true,
  "createdAt"   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chronic_conditions_patient ON chronic_conditions("patientId");

-- ============================================================================
-- PRESCRIPTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "doctorId"       TEXT NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  "patientId"      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "imageBase64"    TEXT,
  "imageBase64_enc" TEXT,
  notes            TEXT,
  notes_enc        TEXT,
  medications      TEXT DEFAULT '[]',
  medications_enc  TEXT,
  "followUpDate"   TIMESTAMPTZ,
  "followUpNotes"  TEXT,
  "followUpNotes_enc" TEXT,
  "inviteToken"    TEXT,
  "inviteStatus"   TEXT DEFAULT 'sent',
  "inviteExpiresAt" TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions("patientId");
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions("doctorId");
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_patient ON prescriptions("doctorId", "patientId");

CREATE TRIGGER prescriptions_updated_at BEFORE UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- MEDICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS medications (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"        TEXT REFERENCES users(id) ON DELETE CASCADE,
  "familyMemberId" TEXT,
  name            TEXT,
  name_enc        TEXT,
  dosage          TEXT,
  dosage_enc      TEXT,
  times           TEXT NOT NULL,
  frequency       TEXT NOT NULL,
  instructions    TEXT,
  instructions_enc TEXT,
  notes           TEXT,
  notes_enc       TEXT,
  color           TEXT DEFAULT 'emerald',
  "imageUrl"      TEXT,
  "stockRemaining" INTEGER,
  active          BOOLEAN DEFAULT true,
  "timeWindowEnd" TEXT DEFAULT '09:00',
  "reminderInterval" INTEGER DEFAULT 10,
  "deletedAt"     TIMESTAMPTZ,
  "createdAt"     TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"     TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications("userId");
CREATE INDEX IF NOT EXISTS idx_medications_active ON medications(active);

CREATE TRIGGER medications_updated_at BEFORE UPDATE ON medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- REMINDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS reminders (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "medicationId" TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  time         TEXT NOT NULL,
  status       "ReminderStatus" DEFAULT 'pending',
  "takenAt"    TIMESTAMPTZ,
  "reminderCount" INTEGER DEFAULT 0,
  escalated    BOOLEAN DEFAULT false,
  "escalatedAt" TIMESTAMPTZ,
  "deletedAt"   TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE("medicationId", date, time)
);

CREATE INDEX IF NOT EXISTS idx_reminders_medication ON reminders("medicationId", date);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);

CREATE TRIGGER reminders_updated_at BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- CHAT MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      "ChatMessageRole" DEFAULT 'user',
  content   TEXT,
  content_enc TEXT,
  source    TEXT,
  "deletedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "expiresAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created ON chat_messages("userId", "createdAt");

CREATE TRIGGER chat_messages_updated_at BEFORE UPDATE ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- FAMILY
-- ============================================================================
CREATE TABLE IF NOT EXISTS families (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  "joinCode"  TEXT UNIQUE,
  "ownerId"   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "deletedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_families_owner ON families("ownerId");
CREATE INDEX IF NOT EXISTS idx_families_join_code ON families("joinCode");

-- ============================================================================
-- FAMILY MEMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS family_members (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "familyId"              TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  "userId"                TEXT REFERENCES users(id) ON DELETE CASCADE,
  name                    TEXT,
  name_enc                TEXT,
  relation                TEXT NOT NULL,
  relation_enc            TEXT,
  age                     INTEGER,
  role                    TEXT DEFAULT 'patient',
  color                   TEXT DEFAULT 'emerald',
  conditions              TEXT DEFAULT '[]',
  conditions_enc          TEXT,
  "photoUrl"              TEXT,
  "inviteEmail"           TEXT,
  "inviteEmail_enc"       TEXT,
  "inviteToken"           TEXT,
  "inviteToken_enc"       TEXT,
  "inviteStatus"          TEXT DEFAULT 'accepted',
  "inviteExpiresAt"       TIMESTAMPTZ,
  "relationVerificationToken" TEXT,
  "createdAt"             TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members("familyId");
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members("userId");

-- ============================================================================
-- EMERGENCY ALERTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS emergency_alerts (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "familyId"     TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  "familyMemberId" TEXT,
  "memberName"   TEXT,
  "memberName_enc" TEXT,
  "reporterId"   TEXT REFERENCES users(id) ON DELETE CASCADE,
  type           TEXT DEFAULT 'sos',
  tier           TEXT DEFAULT 'critical',
  location       TEXT,
  location_enc   TEXT,
  notes          TEXT,
  notes_enc      TEXT,
  status         TEXT DEFAULT 'active',
  "notifiedDoctors" TEXT DEFAULT '[]',
  "deletedAt"    TIMESTAMPTZ,
  "createdAt"    TIMESTAMPTZ DEFAULT now() NOT NULL,
  "resolvedAt"   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_emergency_alerts_family ON emergency_alerts("familyId");
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_member ON emergency_alerts("familyMemberId");

-- ============================================================================
-- PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  amount          INTEGER NOT NULL,
  currency        TEXT DEFAULT 'USD',
  status          "PaymentStatus" DEFAULT 'pending',
  provider        TEXT DEFAULT 'mock',
  "providerRef"   TEXT,
  "providerEventId" TEXT UNIQUE,
  description     TEXT,
  description_enc TEXT,
  "createdAt"     TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments("userId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"     TEXT REFERENCES users(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  category     TEXT DEFAULT 'access',
  "resourceType" TEXT,
  "resourceId" TEXT,
  "httpMethod"  TEXT,
  "httpPath"    TEXT,
  "statusCode"  INTEGER,
  "userAgent"   TEXT,
  ip           TEXT,
  ip_enc       TEXT,
  outcome      TEXT,
  "riskScore"  INTEGER DEFAULT 0,
  details      TEXT,
  metadata     TEXT DEFAULT '{}',
  "deletedAt"   TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs("userId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, "createdAt");
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs("resourceType", "resourceId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs("createdAt");
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk ON audit_logs("riskScore");

-- ============================================================================
-- HEALTH SCORES
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_scores (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date      DATE NOT NULL,
  score     INTEGER NOT NULL,
  breakdown TEXT DEFAULT '{}',
  breakdown_enc TEXT,
  "deletedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE("userId", date)
);

CREATE INDEX IF NOT EXISTS idx_health_scores_user ON health_scores("userId");

CREATE TRIGGER health_scores_updated_at BEFORE UPDATE ON health_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- HEALTH JOURNALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_journals (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date      DATE NOT NULL,
  symptoms  TEXT DEFAULT '[]',
  symptoms_enc TEXT,
  mood      TEXT,
  mood_enc  TEXT,
  notes     TEXT,
  notes_enc TEXT,
  vitals    TEXT,
  vitals_enc TEXT,
  "deletedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE("userId", date)
);

CREATE INDEX IF NOT EXISTS idx_health_journals_user ON health_journals("userId");

CREATE TRIGGER health_journals_updated_at BEFORE UPDATE ON health_journals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- FAMILY HEALTH ALERTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS family_health_alerts (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "familyId" TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  "memberId" TEXT NOT NULL,
  type      TEXT NOT NULL,
  title     TEXT,
  title_enc TEXT,
  message   TEXT,
  message_enc TEXT,
  severity  TEXT DEFAULT 'info',
  "read"    BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_family_health_alerts_family ON family_health_alerts("familyId");
CREATE INDEX IF NOT EXISTS idx_family_health_alerts_member ON family_health_alerts("memberId");

-- ============================================================================
-- MEDICINE INVENTORY
-- ============================================================================
CREATE TABLE IF NOT EXISTS medicine_inventories (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"     TEXT NOT NULL,
  "medicationId" TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  "totalPills" INTEGER NOT NULL,
  remaining    INTEGER NOT NULL,
  "refillDate" TIMESTAMPTZ,
  "expiryDate" TIMESTAMPTZ,
  "lastRefillAt" TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_medicine_inventories_user ON medicine_inventories("userId");

CREATE TRIGGER medicine_inventories_updated_at BEFORE UPDATE ON medicine_inventories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- USER STREAKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_streaks (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type      TEXT NOT NULL,
  count     INTEGER DEFAULT 0,
  "bestCount" INTEGER DEFAULT 0,
  "lastDate" DATE NOT NULL,
  "deletedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE("userId", type)
);

CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON user_streaks("userId");

CREATE TRIGGER user_streaks_updated_at BEFORE UPDATE ON user_streaks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- USER BADGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_badges (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "badgeType" TEXT NOT NULL,
  "deletedAt" TIMESTAMPTZ,
  "earnedAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE("userId", "badgeType")
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges("userId");

-- ============================================================================
-- PRESCRIPTION INTELLIGENCE
-- ============================================================================
CREATE TABLE IF NOT EXISTS prescription_intelligence (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "rawText"    TEXT,
  "rawText_enc" TEXT,
  "imageData"  TEXT,
  "imageData_enc" TEXT,
  medications  TEXT DEFAULT '[]',
  medications_enc TEXT,
  schedule     TEXT DEFAULT '[]',
  schedule_enc  TEXT,
  interactions TEXT DEFAULT '[]',
  interactions_enc TEXT,
  warnings     TEXT DEFAULT '[]',
  warnings_enc  TEXT,
  "deletedAt"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prescription_intelligence_user ON prescription_intelligence("userId");

CREATE TRIGGER prescription_intelligence_updated_at BEFORE UPDATE ON prescription_intelligence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- REFERRALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS referrals (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "referrerId"   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code           TEXT UNIQUE NOT NULL,
  "referralCount" INTEGER DEFAULT 0,
  "deletedAt"    TIMESTAMPTZ,
  "createdAt"    TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals("referrerId");
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code);

CREATE TRIGGER referrals_updated_at BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- REFERRAL USAGE
-- ============================================================================
CREATE TABLE IF NOT EXISTS referral_usage (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "referralId" TEXT NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  "usedById"  TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_referral_usage_referral ON referral_usage("referralId");
CREATE INDEX IF NOT EXISTS idx_referral_usage_used ON referral_usage("usedById");
CREATE INDEX IF NOT EXISTS idx_referral_usage_referrer ON referral_usage("referrerId");

CREATE TRIGGER referral_usage_updated_at BEFORE UPDATE ON referral_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- PRESCRIPTION TEMPLATES
-- ============================================================================
CREATE TABLE IF NOT EXISTS prescription_templates (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "doctorId"  TEXT NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  medications TEXT DEFAULT '[]',
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prescription_templates_doctor ON prescription_templates("doctorId");

CREATE TRIGGER prescription_templates_updated_at BEFORE UPDATE ON prescription_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- VIDEO CALLS
-- ============================================================================
CREATE TABLE IF NOT EXISTS video_calls (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "familyId"    TEXT NOT NULL REFERENCES families(id),
  "appointmentId" TEXT,
  "roomName"    TEXT NOT NULL,
  "initiatedBy" TEXT NOT NULL,
  status        TEXT DEFAULT 'ringing',
  "startedAt"   TIMESTAMPTZ,
  "endedAt"     TIMESTAMPTZ,
  "durationSec" INTEGER,
  "recordingUrl" TEXT,
  "qualityScore" INTEGER,
  notes         TEXT,
  "createdAt"   TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_video_calls_family ON video_calls("familyId");
CREATE INDEX IF NOT EXISTS idx_video_calls_appointment ON video_calls("appointmentId");
CREATE INDEX IF NOT EXISTS idx_video_calls_initiator ON video_calls("initiatedBy");

CREATE TRIGGER video_calls_updated_at BEFORE UPDATE ON video_calls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- VIDEO CALL PARTICIPANTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS video_call_participants (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "videoCallId"      TEXT NOT NULL REFERENCES video_calls(id) ON DELETE CASCADE,
  "userId"           TEXT NOT NULL,
  "userRole"         TEXT NOT NULL,
  "displayName"      TEXT,
  "joinedAt"         TIMESTAMPTZ DEFAULT now() NOT NULL,
  "leftAt"           TIMESTAMPTZ,
  "connectionQuality" TEXT,
  "iceCandidateType"  TEXT
);

CREATE INDEX IF NOT EXISTS idx_video_call_participants_call ON video_call_participants("videoCallId");
CREATE INDEX IF NOT EXISTS idx_video_call_participants_user ON video_call_participants("userId");

-- ============================================================================
-- CONSULTATION NOTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS consultation_notes (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "doctorId"  TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  content   TEXT,
  content_enc TEXT,
  type      TEXT DEFAULT 'observation',
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt" TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_consultation_notes_doctor ON consultation_notes("doctorId", "patientId");
CREATE INDEX IF NOT EXISTS idx_consultation_notes_patient ON consultation_notes("patientId");

CREATE TRIGGER consultation_notes_updated_at BEFORE UPDATE ON consultation_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- REFUNDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS refunds (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "paymentId"    TEXT NOT NULL,
  "appointmentId" TEXT,
  "labBookingId"  TEXT,
  "userId"       TEXT NOT NULL,
  amount         INTEGER NOT NULL,
  currency       TEXT DEFAULT 'USD',
  reason         TEXT NOT NULL,
  "providerRef"  TEXT,
  status         "RefundStatus" DEFAULT 'pending',
  "requestedBy"  TEXT NOT NULL,
  "approvedBy"   TEXT,
  notes          TEXT,
  "proofFile"    TEXT,
  "proofNote"    TEXT,
  "reviewedAt"   TIMESTAMPTZ,
  "reviewedBy"   TEXT,
  "reviewDeadline" TIMESTAMPTZ,
  "createdAt"    TIMESTAMPTZ DEFAULT now() NOT NULL,
  "processedAt"  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refunds_user ON refunds("userId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

-- ============================================================================
-- PAYOUTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payouts (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "doctorId"    TEXT,
  "labId"       TEXT,
  "appointmentId" TEXT,
  "labBookingId"  TEXT,
  amount        INTEGER NOT NULL,
  commission    INTEGER NOT NULL,
  platformFee   INTEGER DEFAULT 0,
  netAmount     INTEGER DEFAULT 0,
  currency      TEXT DEFAULT 'USD',
  status        "PayoutStatus" DEFAULT 'pending',
  "providerRef" TEXT,
  "scheduledAt" TIMESTAMPTZ,
  "paidAt"       TIMESTAMPTZ,
  "periodStart" TIMESTAMPTZ NOT NULL,
  "periodEnd"   TIMESTAMPTZ NOT NULL,
  "createdAt"   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payouts_user ON payouts("userId", status);
CREATE INDEX IF NOT EXISTS idx_payouts_doctor ON payouts("doctorId", status);
CREATE INDEX IF NOT EXISTS idx_payouts_lab ON payouts("labId", status);

-- ============================================================================
-- COMPLAINTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS complaints (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category            TEXT NOT NULL,
  subject             TEXT NOT NULL,
  description         TEXT NOT NULL,
  "relatedEntityType" TEXT,
  "relatedEntityId"   TEXT,
  priority            TEXT DEFAULT 'medium',
  status              TEXT DEFAULT 'open',
  resolution          TEXT,
  "resolvedBy"        TEXT,
  "resolvedAt"        TIMESTAMPTZ,
  "proofFile"         TEXT,
  "evidenceNote"      TEXT,
  "userVerdict"       TEXT,
  "userVerdictAt"     TIMESTAMPTZ,
  "adminNotes"        TEXT,
  "createdAt"         TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"         TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_complaints_user ON complaints("userId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status, "createdAt");
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);

CREATE TRIGGER complaints_updated_at BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- NOTIFICATION LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_logs (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    TEXT REFERENCES users(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL,
  type        TEXT NOT NULL,
  title       TEXT,
  title_enc   TEXT,
  body        TEXT,
  body_enc    TEXT,
  recipient   TEXT,
  recipient_enc TEXT,
  status      TEXT DEFAULT 'sent',
  cost        REAL DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs("userId");

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
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

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-documents',
  'medical-documents',
  false,
  5242880,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prescriptions',
  'prescriptions',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lab-results',
  'lab-results',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SUPABASE AUTH: SERVICE ROLE BYPASS (for API routes)
-- ============================================================================
-- This schema is designed to work alongside Supabase Auth (auth.users).
-- The app uses Supabase Auth for authentication but stores app data
-- in these tables linked via user IDs.

-- ============================================================================
-- SAMPLE DATA (demo users) — seeded separately
-- ============================================================================
-- Demo accounts are seeded via the E2E seed script.
-- All demo users have isDemo=true and role-based profiles.

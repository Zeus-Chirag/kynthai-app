-- HIPAA / PHI field-level encryption migration
-- Adds encrypted counterpart columns for all sensitive fields.

-- Users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name_enc" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_enc" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dateOfBirth_enc" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "allergies_enc" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetToken_enc" TEXT;

-- Doctor profiles
ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "licenseNumber_enc" TEXT;
ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "bio_enc" TEXT;
ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "rejectionReason_enc" TEXT;
ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "ssn_enc" TEXT;
ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "taxId_enc" TEXT;
ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "degreeType_enc" TEXT;
ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "medicalCouncil_enc" TEXT;

-- Lab profiles
ALTER TABLE "lab_profiles" ADD COLUMN IF NOT EXISTS "labName_enc" TEXT;
ALTER TABLE "lab_profiles" ADD COLUMN IF NOT EXISTS "licenseNumber_enc" TEXT;
ALTER TABLE "lab_profiles" ADD COLUMN IF NOT EXISTS "address_enc" TEXT;
ALTER TABLE "lab_profiles" ADD COLUMN IF NOT EXISTS "rejectionReason_enc" TEXT;

-- Appointments
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reason_enc" TEXT;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "notes_enc" TEXT;

-- Chronic conditions
ALTER TABLE "chronic_conditions" ADD COLUMN IF NOT EXISTS "name_enc" TEXT;
ALTER TABLE "chronic_conditions" ADD COLUMN IF NOT EXISTS "diagnosedDate_enc" TEXT;
ALTER TABLE "chronic_conditions" ADD COLUMN IF NOT EXISTS "medications_enc" TEXT;
ALTER TABLE "chronic_conditions" ADD COLUMN IF NOT EXISTS "notes_enc" TEXT;

-- Prescriptions
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "imageBase64_enc" TEXT;
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "notes_enc" TEXT;
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "medications_enc" TEXT;
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "followUpNotes_enc" TEXT;

-- Medications
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "name_enc" TEXT;
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "dosage_enc" TEXT;
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "instructions_enc" TEXT;
ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "notes_enc" TEXT;

-- Consultation notes
ALTER TABLE "consultation_notes" ADD COLUMN IF NOT EXISTS "content_enc" TEXT;

-- Health journals
ALTER TABLE "health_journals" ADD COLUMN IF NOT EXISTS "symptoms_enc" TEXT;
ALTER TABLE "health_journals" ADD COLUMN IF NOT EXISTS "mood_enc" TEXT;
ALTER TABLE "health_journals" ADD COLUMN IF NOT EXISTS "notes_enc" TEXT;
ALTER TABLE "health_journals" ADD COLUMN IF NOT EXISTS "vitals_enc" TEXT;

-- Chat messages
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "content_enc" TEXT;

-- Consult messages
ALTER TABLE "consult_messages" ADD COLUMN IF NOT EXISTS "content_enc" TEXT;

-- Medicine orders
ALTER TABLE "medicine_orders" ADD COLUMN IF NOT EXISTS "items_enc" TEXT;
ALTER TABLE "medicine_orders" ADD COLUMN IF NOT EXISTS "address_enc" TEXT;

-- Lab bookings
ALTER TABLE "lab_bookings" ADD COLUMN IF NOT EXISTS "notes_enc" TEXT;
ALTER TABLE "lab_bookings" ADD COLUMN IF NOT EXISTS "resultsNote_enc" TEXT;
ALTER TABLE "lab_bookings" ADD COLUMN IF NOT EXISTS "tests_enc" TEXT;

-- Emergency alerts
ALTER TABLE "emergency_alerts" ADD COLUMN IF NOT EXISTS "memberName_enc" TEXT;
ALTER TABLE "emergency_alerts" ADD COLUMN IF NOT EXISTS "location_enc" TEXT;
ALTER TABLE "emergency_alerts" ADD COLUMN IF NOT EXISTS "notes_enc" TEXT;

-- Family members
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "name_enc" TEXT;
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "relation_enc" TEXT;
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "conditions_enc" TEXT;
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "inviteEmail_enc" TEXT;
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "inviteToken_enc" TEXT;

-- Family health alerts
ALTER TABLE "family_health_alerts" ADD COLUMN IF NOT EXISTS "title_enc" TEXT;
ALTER TABLE "family_health_alerts" ADD COLUMN IF NOT EXISTS "message_enc" TEXT;

-- Health scores
ALTER TABLE "health_scores" ADD COLUMN IF NOT EXISTS "breakdown_enc" TEXT;

-- Audit logs
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "ip_enc" TEXT;

-- Notification logs
ALTER TABLE "notification_logs" ADD COLUMN IF NOT EXISTS "title_enc" TEXT;
ALTER TABLE "notification_logs" ADD COLUMN IF NOT EXISTS "body_enc" TEXT;
ALTER TABLE "notification_logs" ADD COLUMN IF NOT EXISTS "recipient_enc" TEXT;

-- Payments
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "description_enc" TEXT;

-- Prescription intelligence
ALTER TABLE "prescription_intelligence" ADD COLUMN IF NOT EXISTS "rawText_enc" TEXT;
ALTER TABLE "prescription_intelligence" ADD COLUMN IF NOT EXISTS "imageData_enc" TEXT;
ALTER TABLE "prescription_intelligence" ADD COLUMN IF NOT EXISTS "medications_enc" TEXT;
ALTER TABLE "prescription_intelligence" ADD COLUMN IF NOT EXISTS "schedule_enc" TEXT;
ALTER TABLE "prescription_intelligence" ADD COLUMN IF NOT EXISTS "interactions_enc" TEXT;
ALTER TABLE "prescription_intelligence" ADD COLUMN IF NOT EXISTS "warnings_enc" TEXT;

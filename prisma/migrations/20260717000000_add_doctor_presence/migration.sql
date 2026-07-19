-- Add lastActiveAt column for real-time presence tracking
ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP;

-- Index for the common presence-query pattern
CREATE INDEX IF NOT EXISTS "idx_doctor_profiles_last_active"
  ON "doctor_profiles"("lastActiveAt");

-- Add notificationPrefs column to users table
-- Stores per-channel notification toggle preferences as JSON
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notificationPrefs" TEXT;

-- Rollback: remove notificationPrefs column
ALTER TABLE "users" DROP COLUMN IF EXISTS "notificationPrefs";

-- Add invite fields to prescriptions table
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "inviteToken" VARCHAR;
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "inviteStatus" VARCHAR DEFAULT 'sent';
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "inviteExpiresAt" TIMESTAMP;

-- Create prescription_templates table
CREATE TABLE IF NOT EXISTS "prescription_templates" (
    "id" VARCHAR NOT NULL,
    "doctorId" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "medications" VARCHAR NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on prescription_templates
CREATE INDEX IF NOT EXISTS "prescription_templates_doctorId_idx" ON "prescription_templates"("doctorId");

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

// Secret key to prevent unauthorized access - MUST be set in Vercel env vars
// If not set, requests are REJECTED (no fallback secret)
const MIGRATION_SECRET = process.env.MIGRATION_SECRET;
export async function POST(req: NextRequest) {
  // ponytail: refuse to run the schema-altering migration in production. This
  // is a one-time scaffolding endpoint guarded only by a bearer secret, not a
  // runtime service. Mirror the /api/debug NODE_ENV gate so a consumer can't
  // mass-alter production tables (or half-migrate) via a leaked/weak secret.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!MIGRATION_SECRET) {
    // Reject if not configured — never fall back to a guessable default
    return NextResponse.json({ error: 'Migration not configured' }, { status: 503 });
  }
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${MIGRATION_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: string[] = []

    // Add encrypted columns to users table
    const userEncryptedColumns = [
      { column: 'name_enc', type: 'TEXT' },
      { column: 'phone_enc', type: 'TEXT' },
      { column: 'dateOfBirth_enc', type: 'TIMESTAMP' },
      { column: 'allergies_enc', type: 'TEXT' },
      { column: 'passwordResetToken_enc', type: 'TEXT' },
      { column: 'emailVerificationToken_enc', type: 'TEXT' },
    ]

    // Add missing regular columns to users table
    const userRegularColumns = [
      { column: 'password', type: 'TEXT' },
      { column: 'emailVerified', type: 'TIMESTAMP' },
      { column: 'subscriptionTier', type: 'TEXT' },
      { column: 'stripeCustomerId', type: 'TEXT' },
      { column: 'stripeSubscriptionId', type: 'TEXT' },
      { column: 'stripePriceId', type: 'TEXT' },
      { column: 'stripeCurrentPeriodEnd', type: 'TIMESTAMP' },
    ]

    for (const col of userEncryptedColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "${col.column}" ${col.type}`)
        results.push(`Added ${col.column} to users`)
      } catch (e: any) {
        results.push(`Failed to add ${col.column} to users: ${e.message}`)
      }
    }

    for (const col of userRegularColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "${col.column}" ${col.type}`)
        results.push(`Added ${col.column} to users`)
      } catch (e: any) {
        results.push(`Failed to add ${col.column} to users: ${e.message}`)
      }
    }

    // DoctorProfile encrypted columns
    const doctorEncryptedColumns = [
      { column: 'licenseNumber_enc', type: 'TEXT' },
      { column: 'bio_enc', type: 'TEXT' },
      { column: 'rejectionReason_enc', type: 'TEXT' },
      { column: 'ssn_enc', type: 'TEXT' },
      { column: 'taxId_enc', type: 'TEXT' },
      { column: 'degreeType_enc', type: 'TEXT' },
      { column: 'medicalCouncil_enc', type: 'TEXT' },
    ]

    for (const col of doctorEncryptedColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "doctor_profiles" ADD COLUMN IF NOT EXISTS "${col.column}" ${col.type}`)
        results.push(`Added ${col.column} to doctor_profiles`)
      } catch (e: any) {
        results.push(`Failed to add ${col.column} to doctor_profiles: ${e.message}`)
      }
    }

    // LabProfile encrypted columns
    const labEncryptedColumns = [
      { column: 'labName_enc', type: 'TEXT' },
      { column: 'licenseNumber_enc', type: 'TEXT' },
      { column: 'address_enc', type: 'TEXT' },
      { column: 'rejectionReason_enc', type: 'TEXT' },
    ]

    for (const col of labEncryptedColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "lab_profiles" ADD COLUMN IF NOT EXISTS "${col.column}" ${col.type}`)
        results.push(`Added ${col.column} to lab_profiles`)
      } catch (e: any) {
        results.push(`Failed to add ${col.column} to lab_profiles: ${e.message}`)
      }
    }

    // Appointment encrypted columns
    const appointmentEncryptedColumns = [
      { column: 'reason_enc', type: 'TEXT' },
      { column: 'notes_enc', type: 'TEXT' },
    ]

    for (const col of appointmentEncryptedColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "${col.column}" ${col.type}`)
        results.push(`Added ${col.column} to appointments`)
      } catch (e: any) {
        results.push(`Failed to add ${col.column} to appointments: ${e.message}`)
      }
    }

    // ChronicCondition encrypted columns
    const chronicEncryptedColumns = [
      { column: 'name_enc', type: 'TEXT' },
      { column: 'diagnosedDate_enc', type: 'TEXT' },
      { column: 'medications_enc', type: 'TEXT' },
      { column: 'notes_enc', type: 'TEXT' },
    ]

    for (const col of chronicEncryptedColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "chronic_conditions" ADD COLUMN IF NOT EXISTS "${col.column}" ${col.type}`)
        results.push(`Added ${col.column} to chronic_conditions`)
      } catch (e: any) {
        results.push(`Failed to add ${col.column} to chronic_conditions: ${e.message}`)
      }
    }

    // Prescription encrypted columns
    const prescriptionEncryptedColumns = [
      { column: 'imageBase64_enc', type: 'TEXT' },
      { column: 'notes_enc', type: 'TEXT' },
      { column: 'medications_enc', type: 'TEXT' },
      { column: 'followUpNotes_enc', type: 'TEXT' },
    ]

    for (const col of prescriptionEncryptedColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "${col.column}" ${col.type}`)
        results.push(`Added ${col.column} to prescriptions`)
      } catch (e: any) {
        results.push(`Failed to add ${col.column} to prescriptions: ${e.message}`)
      }
    }

    // Medication encrypted columns
    const medicationEncryptedColumns = [
      { column: 'name_enc', type: 'TEXT' },
      { column: 'dosage_enc', type: 'TEXT' },
      { column: 'instructions_enc', type: 'TEXT' },
      { column: 'notes_enc', type: 'TEXT' },
    ]

    for (const col of medicationEncryptedColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "medications" ADD COLUMN IF NOT EXISTS "${col.column}" ${col.type}`)
        results.push(`Added ${col.column} to medications`)
      } catch (e: any) {
        results.push(`Failed to add ${col.column} to medications: ${e.message}`)
      }
    }

    // ConsultationNote encrypted columns
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "consultation_notes" ADD COLUMN IF NOT EXISTS "content_enc" TEXT`)
      results.push('Added content_enc to consultation_notes')
    } catch (e: any) {
      results.push(`Failed to add content_enc to consultation_notes: ${e.message}`)
    }

    // HealthJournal encrypted columns
    const healthJournalEncryptedColumns = [
      { column: 'symptoms_enc', type: 'TEXT' },
      { column: 'mood_enc', type: 'TEXT' },
      { column: 'notes_enc', type: 'TEXT' },
      { column: 'vitals_enc', type: 'TEXT' },
    ]

    for (const col of healthJournalEncryptedColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "health_journals" ADD COLUMN IF NOT EXISTS "${col.column}" ${col.type}`)
        results.push(`Added ${col.column} to health_journals`)
      } catch (e: any) {
        results.push(`Failed to add ${col.column} to health_journals: ${e.message}`)
      }
    }

    // LabBooking encrypted columns
    const labBookingEncryptedColumns = [
      { column: 'notes_enc', type: 'TEXT' },
      { column: 'resultsNote_enc', type: 'TEXT' },
    ]

    for (const col of labBookingEncryptedColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "lab_bookings" ADD COLUMN IF NOT EXISTS "${col.column}" ${col.type}`)
        results.push(`Added ${col.column} to lab_bookings`)
      } catch (e: any) {
        results.push(`Failed to add ${col.column} to lab_bookings: ${e.message}`)
      }
    }

    // EmergencyAlert encrypted columns
    const emergencyEncryptedColumns = [
      { column: 'memberName_enc', type: 'TEXT' },
      { column: 'location_enc', type: 'TEXT' },
      { column: 'notes_enc', type: 'TEXT' },
    ]

    for (const col of emergencyEncryptedColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "emergency_alerts" ADD COLUMN IF NOT EXISTS "${col.column}" ${col.type}`)
        results.push(`Added ${col.column} to emergency_alerts`)
      } catch (e: any) {
        results.push(`Failed to add ${col.column} to emergency_alerts: ${e.message}`)
      }
    }

    // FamilyMember encrypted columns
    const familyMemberEncryptedColumns = [
      { column: 'name_enc', type: 'TEXT' },
      { column: 'relation_enc', type: 'TEXT' },
      { column: 'conditions_enc', type: 'TEXT' },
      { column: 'inviteEmail_enc', type: 'TEXT' },
      { column: 'inviteToken_enc', type: 'TEXT' },
    ]

    for (const col of familyMemberEncryptedColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "${col.column}" ${col.type}`)
        results.push(`Added ${col.column} to family_members`)
      } catch (e: any) {
        results.push(`Failed to add ${col.column} to family_members: ${e.message}`)
      }
    }

    // ChatMessage encrypted columns
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "content_enc" TEXT`)
      results.push('Added content_enc to chat_messages')
    } catch (e: any) {
      results.push(`Failed to add content_enc to chat_messages: ${e.message}`)
    }

    // ConsultMessage encrypted columns
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "consult_messages" ADD COLUMN IF NOT EXISTS "content_enc" TEXT`)
      results.push('Added content_enc to consult_messages')
    } catch (e: any) {
      results.push(`Failed to add content_enc to consult_messages: ${e.message}`)
    }

    // MedicineOrder encrypted columns
    const medicineOrderEncryptedColumns = [
      { column: 'items_enc', type: 'TEXT' },
      { column: 'address_enc', type: 'TEXT' },
    ]

    for (const col of medicineOrderEncryptedColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "medicine_orders" ADD COLUMN IF NOT EXISTS "${col.column}" ${col.type}`)
        results.push(`Added ${col.column} to medicine_orders`)
      } catch (e: any) {
        results.push(`Failed to add ${col.column} to medicine_orders: ${e.message}`)
      }
    }

    // EmergencyAlert encrypted columns (already done above)

    // Complaint encrypted columns
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "description_enc" TEXT`)
      results.push('Added description_enc to complaints')
    } catch (e: any) {
      results.push(`Failed to add description_enc to complaints: ${e.message}`)
    }

    // Payment encrypted columns
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "description_enc" TEXT`)
      results.push('Added description_enc to payments')
    } catch (e: any) {
      results.push(`Failed to add description_enc to payments: ${e.message}`)
    }

    // Refund encrypted columns
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "refunds" ADD COLUMN IF NOT EXISTS "notes_enc" TEXT`)
      results.push('Added notes_enc to refunds')
    } catch (e: any) {
      results.push(`Failed to add notes_enc to refunds: ${e.message}`)
    }

    // NotificationLog encrypted columns
    const notificationEncryptedColumns = [
      { column: 'title_enc', type: 'TEXT' },
      { column: 'body_enc', type: 'TEXT' },
      { column: 'recipient_enc', type: 'TEXT' },
    ]

    for (const col of notificationEncryptedColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "notification_logs" ADD COLUMN IF NOT EXISTS "${col.column}" ${col.type}`)
        results.push(`Added ${col.column} to notification_logs`)
      } catch (e: any) {
        results.push(`Failed to add ${col.column} to notification_logs: ${e.message}`)
      }
    }

    // PrescriptionIntelligence encrypted columns
    const prescriptionIntelEncryptedColumns = [
      { column: 'rawText_enc', type: 'TEXT' },
      { column: 'imageData_enc', type: 'TEXT' },
      { column: 'medications_enc', type: 'TEXT' },
      { column: 'schedule_enc', type: 'TEXT' },
      { column: 'interactions_enc', type: 'TEXT' },
      { column: 'warnings_enc', type: 'TEXT' },
    ]

    for (const col of prescriptionIntelEncryptedColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "prescription_intelligence" ADD COLUMN IF NOT EXISTS "${col.column}" ${col.type}`)
        results.push(`Added ${col.column} to prescription_intelligence`)
      } catch (e: any) {
        results.push(`Failed to add ${col.column} to prescription_intelligence: ${e.message}`)
      }
    }

    // HealthJournal encrypted columns (already done above)

    // FamilyHealthAlert encrypted columns
    const familyHealthAlertEncryptedColumns = [
      { column: 'title_enc', type: 'TEXT' },
      { column: 'message_enc', type: 'TEXT' },
    ]

    for (const col of familyHealthAlertEncryptedColumns) {
      try {
        await db.$executeRawUnsafe(`ALTER TABLE "family_health_alerts" ADD COLUMN IF NOT EXISTS "${col.column}" ${col.type}`)
        results.push(`Added ${col.column} to family_health_alerts`)
      } catch (e: any) {
        results.push(`Failed to add ${col.column} to family_health_alerts: ${e.message}`)
      }
    }

    // AuditLog encrypted columns
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "ip_enc" TEXT`)
      results.push('Added ip_enc to audit_logs')
    } catch (e: any) {
      results.push(`Failed to add ip_enc to audit_logs: ${e.message}`)
    }

    // NotificationLog encrypted columns (already done above)

    // Payment encrypted columns (already done above)

    // PrescriptionIntelligence encrypted columns (already done above)

    // Referral encrypted columns (if any)
    // ... add if needed

    // AuditLog encrypted columns (already done)

    // FreeTierUsageAudit - no encrypted fields

    // HealthScore - encrypted breakdown
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "health_scores" ADD COLUMN IF NOT EXISTS "breakdown_enc" TEXT`)
      results.push('Added breakdown_enc to health_scores')
    } catch (e: any) {
      results.push(`Failed to add breakdown_enc to health_scores: ${e.message}`)
    }

    // PrescriptionTemplate - no encrypted fields

    // VideoCall - no encrypted fields

    // VideoCallParticipant - no encrypted fields

    // Feedback - no encrypted fields

    return NextResponse.json({
      success: true,
      message: 'Migration completed',
      results
    })
  } catch (error: any) {
    // SECURITY: never echo internal error messages (table/column names, DSN
    // fragments, driver internals) to unauthenticated callers — log only.
    logger.phiSafeError(error, 'migrate.POST')
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}
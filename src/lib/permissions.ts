/**
 * permissions.ts
 *
 * Centralized role-based access control (RBAC) for Kyntha.
 * All authorization decisions flow through this module.
 *
 * Health Data Protection FINAL RULE (2024): least privilege, minimum necessary access.
 */

import type { User } from '@prisma/client'

// ── Role definitions ──────────────────────────────────────────────────────────

export type KynthaRole = 'patient' | 'doctor' | 'lab' | 'caretaker' | 'admin'

export const ROLE_LABELS: Record<KynthaRole, string> = {
  patient:   'Patient',
  doctor:    'Doctor',
  lab:       'Lab',
  caretaker: 'Family / Caretaker',
  admin:     'Administrator',
}

/**
 * Upper bound on appointment lead-time for care-team roles.
 * Admin and system roles bypass or get extended limits.
 */
export const DEFAULT_APPOINTMENT_LEAD_DAYS = 30

/**
 * Search scopes — what data each role can read.
 * key = role requesting access, value[] = roles whose data they can read.
 */
export const SEARCH_SCOPE: Record<KynthaRole, readonly KynthaRole[]> = {
  patient:    ['patient'],       // patient can only search themselves
  doctor:     ['patient'],       // doctor can search patients they are linked to (enforced per-AIDOR)
  lab:        ['patient'],       // lab can search patients whose lab results they handle
  caretaker:  ['patient'],       // caretaker can only search family members they own
  admin:      ['patient', 'doctor', 'lab', 'caretaker'], // admin can search all users
}

/**
 * Which portals each role can access.
 *
 * SECURITY-CRITICAL MATRIX — the single source of truth for portal access:
 *
 *   - patient   → patient portal ONLY
 *   - doctor    → doctor portal ONLY  
 *   - lab       → lab portal ONLY
 *   - caretaker → caretaker portal ONLY
 *   - admin     → admin portal ONLY
 *
 * Cross-portal access is PROHIBITED. Violations are audit-logged.
 */
export const PORTAL_ACCESS: Readonly<Record<KynthaRole, readonly KynthaRole[]>> = {
  patient:    ['patient'],
  doctor:     ['doctor'],
  lab:        ['lab'],
  caretaker:  ['caretaker'],
  admin:      ['admin'],
}

/**
 * Which roles can manage (create/update/delete) lab bookings.
 */
export const LAB_BOOKING_MANAGERS: readonly KynthaRole[] = ['patient', 'caretaker', 'admin']

/**
 * Which roles can view lab results.
 */
export const LAB_RESULT_VIEWERS: readonly KynthaRole[] = ['patient', 'doctor', 'lab', 'admin']

/**
 * Which roles can manage prescriptions.
 */
export const PRESCRIPTION_MANAGERS: readonly KynthaRole[] = ['doctor', 'admin']

/**
 * Which roles can manage family members.
 */
export const FAMILY_MANAGERS: readonly KynthaRole[] = ['patient', 'caretaker']

/**
 * Which roles can manage appointments.
 */
export const APPOINTMENT_MANAGERS: readonly KynthaRole[] = ['patient', 'caretaker', 'doctor', 'admin']

/**
 * Which roles can view all notifications / send push to all users.
 */
export const NOTIFICATION_ADMINS: readonly KynthaRole[] = ['admin']

// ── Consent gates (Health Data Protection minimum necessary) ───────────────────────────────────

export type ConsentFlag = keyof Pick<User, 'dataProcessingConsent' | 'aiTrainingConsent'>

/**
 * Data-scoped consent requirements per endpoint category.
 */
export const CONSENT_REQUIRED: Record<string, ConsentFlag | ConsentFlag[]> = {
  // Medications require data processing consent (handling sensitive health data)
  medication:    'dataProcessingConsent',
  appointment:   'dataProcessingConsent',
  // AI features require AI training consent
  aiChat:        ['dataProcessingConsent', 'aiTrainingConsent'],
  aiNotes:       ['dataProcessingConsent', 'aiTrainingConsent'],
  symptomAnalyzer: ['dataProcessingConsent', 'aiTrainingConsent'],
}

// ── Authorization helpers ──────────────────────────────────────────────────────

/**
 * Check if a user's role is allowed to access a specific portal.
 * Returns true if the role is in the portal's access list.
 */
export function canAccessPortal(role: string, portal: string): boolean {
  // Only exact-role access permitted — each role gets ONE portal only
  return role === portal
}

/**
 * Check if a user can access someone else's data.
 * Rules:
 *   - Users can always access their own data
 *   - caretaker/admin can access patients in their family/organization
 *   - doctor/lab can access patients linked to them via appointments
 *   - Strictly enforced per-request — no cross-portal leakage
 */
export function canAccessUserData(requesterRole: string, requesterId: string, targetUserId: string): boolean {
  if (requesterId === targetUserId) return true
  if (requesterRole === 'admin') return true
  // caretaker/admin can access family members — family link enforced per-AIDOR in DB queries
  if (requesterRole === 'caretaker') {
    // caller must pass family context — enforced in DB query, not here
    return true // authorization continues at DB layer
  }
  if (requesterRole === 'doctor' || requesterRole === 'lab') {
    // doctor/lab access to patient data enforced via appointment linkage
    return true // authorization continues at DB layer
  }
  return false
}

/**
 * Return the portal key for a user role.
 * Used for redirect-after-login and session management.
 */
export function userPortal(role: string): KynthaRole | null {
  const validRoles: KynthaRole[] = ['patient', 'doctor', 'lab', 'caretaker', 'admin']
  return validRoles.includes(role as KynthaRole) ? (role as KynthaRole) : null
}

/**
 * Verify that the role is a recognized Kyntha role.
 */
export function isValidRole(role: string): role is KynthaRole {
  const validRoles: KynthaRole[] = ['patient', 'doctor', 'lab', 'caretaker', 'admin']
  return validRoles.includes(role as KynthaRole)
}

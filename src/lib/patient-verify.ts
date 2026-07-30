/**
 * Patient Identity Verification — utilities for:
 * - Sending SMS verification codes
 * - Storing verification status
 * - Uploading identity documents
 * - Identity confirmation affidavits
 */

export interface IdentityDocument {
  id: string;
  type: 'passport' | 'drivers_license' | 'state_id' | 'other';
  fileName: string;
  uploadedAt: string;
  verified: boolean;
}

export interface PatientVerificationStatus {
  emailVerified: boolean;
  phoneVerified: boolean;
  identityConfirmed: boolean;
  idDocumentUploaded: boolean;
  idDocumentVerified: boolean;
  overallLevel: 'unverified' | 'email_verified' | 'identity_confirmed' | 'id_verified' | 'pending_review' | 'rejected';
}

/**
 * Computes overall verification level from individual flags.
 */
export function computeVerificationLevel(status: {
  emailVerified: boolean;
  phoneVerified: boolean;
  identityConfirmed: boolean;
  idDocumentUploaded: boolean;
  idDocumentVerified: boolean;
}): PatientVerificationStatus['overallLevel'] {
  if (status.idDocumentVerified) return 'id_verified';
  if (status.idDocumentUploaded) return 'pending_review';
  if (status.identityConfirmed && status.phoneVerified) return 'identity_confirmed';
  if (status.emailVerified) return 'email_verified';
  return 'unverified';
}

/**
 * Generates a 6-digit SMS verification code.
 * In production, this would be sent via Twilio or similar.
 */
export function generateSmsCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Validates a 6-digit SMS verification code format.
 */
export function isValidSmsCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Creates an identity confirmation affidavit payload.
 * This is the legal "I am a real person" statement the user signs.
 */
export function createAffidavitPayload(name: string, email: string): {
  statement: string;
  name: string;
  email: string;
  timestamp: string;
} {
  return {
    statement: `I, ${name}, hereby confirm that I am a real person and that all information provided to Kynthai is true and accurate to the best of my knowledge. I understand that providing false information may result in permanent account suspension.`,
    name,
    email,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Allowed ID document types for patient verification.
 */
export const ID_DOCUMENT_TYPES = [
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'state_id', label: 'State ID Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'other', label: 'Other Government ID' },
] as const;

/**
 * US state list for doctor/license verification
 */
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
] as const;

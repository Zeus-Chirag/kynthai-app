/**
 * Multi-Factor Authentication — Supabase Auth MFA integration.
 *
 * Uses Supabase's built-in TOTP MFA (Time-based One-Time Password).
 * Flow:
 *   1. Enroll:  POST /api/auth/mfa/enroll  → returns QR code URL
 *   2. Challenge: POST /api/auth/mfa/challenge → creates a challenge, sends to user's authenticator
 *   3. Verify:  POST /api/auth/mfa/verify   → verifies TOTP code, marks factor as verified
 *
 * Requires Supabase Auth (managed in Supabase dashboard).
 * The anon key is safe to use client-side for MFA operations because
 * Supabase enforces RLS and user-scoped access.
 */

import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'

export interface MfaEnrollResponse {
  factorId: string
  qrCode: string       // SVG data URI — render as <img>
  secret: string       // Plain-text secret for manual entry
  recoveryCodes: string[]  // One-time recovery codes
}

export interface MfaChallengeResponse {
  challengeId: string
  factorId: string
  expiresAt: string
}

export interface MfaVerifyResponse {
  verified: boolean
  factorId: string
}

/**
 * Get a Supabase server client for MFA operations.
 * Uses request cookies so it operates in the user's auth context.
 */
function getSupabaseClient(req: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll() {},
      },
    }
  )
}

/**
 * Enroll a new TOTP factor for the authenticated user.
 *
 * @returns MfaEnrollResponse with QR code, secret, and recovery codes
 */
export async function enrollMfaFactor(req: NextRequest): Promise<MfaEnrollResponse> {
  const supabase = getSupabaseClient(req)

  // Verify the user is authenticated
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('UNAUTHORIZED')
  }

  // Enroll a new TOTP factor
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Authenticator App',
  })

  if (error || !data) {
    throw new Error(error?.message || 'MFA enrollment failed')
  }

  const mfaData = data as any
  return {
    factorId: mfaData.id,
    qrCode: mfaData.totp?.qr_code ?? '',
    secret: mfaData.totp?.secret ?? '',
    recoveryCodes: (mfaData.totp?.recovery_codes as string[]) ?? [],
  }
}

/**
 * Create a challenge for an enrolled MFA factor.
 * This triggers the authenticator app to generate a new code.
 */
export async function createMfaChallenge(
  req: NextRequest,
  factorId: string
): Promise<MfaChallengeResponse> {
  const supabase = getSupabaseClient(req)

  const { data, error } = await supabase.auth.mfa.challenge({
    factorId,
  })

  if (error || !data) {
    throw new Error(error?.message || 'MFA challenge failed')
  }

  const challengeData = data as any
  return {
    challengeId: challengeData.id,
    factorId: challengeData.factors?.[0]?.id ?? factorId,
    expiresAt: challengeData.expires_at ?? '',
  }
}

/**
 * Verify a TOTP code against an active challenge.
 */
export async function verifyMfaFactor(
  req: NextRequest,
  factorId: string,
  challengeId: string,
  code: string
): Promise<MfaVerifyResponse> {
  const supabase = getSupabaseClient(req)

  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  })

  if (error) {
    throw new Error(error?.message || 'MFA verification failed')
  }

  const verifyData = data as any
  return {
    verified: true,
    factorId: verifyData?.id ?? factorId,
  }
}

/**
 * Unenroll (remove) an MFA factor.
 */
export async function unenrollMfaFactor(
  req: NextRequest,
  factorId: string
): Promise<void> {
  const supabase = getSupabaseClient(req)

  const { error } = await supabase.auth.mfa.unenroll({
    factorId,
  })

  if (error) {
    throw new Error(error?.message || 'MFA unenrollment failed')
  }
}

/**
 * List all enrolled MFA factors for the authenticated user.
 */
export async function listMfaFactors(req: NextRequest) {
  const supabase = getSupabaseClient(req)

  const { data, error } = await supabase.auth.mfa.listFactors()

  if (error) {
    throw new Error(error?.message || 'Failed to list MFA factors')
  }

  return {
    all: data?.all ?? [],
    totp: data?.totp ?? [],
    phone: data?.phone ?? [],
  }
}

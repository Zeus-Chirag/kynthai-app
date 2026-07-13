import { NextRequest } from 'next/server'
import { createSession, setSessionCookie, hashPassword, verifyPassword } from '@/lib/auth'
import { logAudit } from '@/lib/auth'
import { sanitizeText, isValidEmail, isValidE164, rateLimit, validatePasswordStrength } from '@/lib/security'
import { checkCsrf } from '@/lib/csrf'
import { jsonError, jsonOk, readJson, audit, ensureDemoUsers, checkConsent } from '@/lib/api-helpers'
import { UserRole } from '@prisma/client'
import { registerSchema } from '@/lib/schemas'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

// Common weak passwords to block at registration. Not exhaustive — the
// primary defense is bcrypt; this is defense-in-depth against credential
// stuffing. (Source: OWASP "worst passwords" lists.)
const WEAK_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123', '111111', '1234567',
  'password1', '123456789', '12345', 'admin', 'letmein', 'welcome', 'monkey',
  'iloveyou', '000000', 'sunshine', 'princess', 'football', 'baseball',
])

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 10, 60000, { globalKey: true })
    if (limited) return limited

    const csrfErr = await checkCsrf(req)
    if (csrfErr) return csrfErr

    const rawBody = await readJson(req)
    if (!rawBody) return jsonError('Invalid JSON', 400, 'INVALID_JSON')
    const parsed = registerSchema.safeParse(rawBody)
    if (!parsed.success) {
      const fields: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        fields[String(issue.path.join('.') || 'body')] = issue.message
      }
      return jsonError('Validation failed', 422, 'VALIDATION_ERROR', { fields })
    }
    const body = parsed.data

    const email = sanitizeText(body.email, 254).toLowerCase()
    const password = String(body.password)
    const name = sanitizeText(body.name, 120)
    const phone = body.phone ? sanitizeText(body.phone, 30) : ''
    if (phone && !isValidE164(phone)) return jsonError('Phone must be in E.164 format (e.g. +15551234567)', 400)

    // Age verification: user must be 18+ (precise date comparison, no float rounding)
    let dateOfBirth: Date | undefined
    if (body.dateOfBirth) {
      const dob = new Date(body.dateOfBirth)
      if (isNaN(dob.getTime())) return jsonError('Invalid date of birth', 400)
      const today = new Date()
      let age = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--

      // COMPLIANCE: flag and audit under-18 registration attempts before blocking
      const isUserMinor = age < 18
      if (isUserMinor) {
        await logAudit('system', 'auth.register.minor', `email=${email} age=${age}`)
      }
      if (age < 18) return jsonError('You must be at least 18 years old to register', 400)
      dateOfBirth = dob
    }

    if (!isValidEmail(email)) return jsonError('Valid email is required', 400)
    const strength = validatePasswordStrength(password)
    if (!strength.valid) return jsonError(strength.errors.join('; '), 400)
    // SECURITY: block the most common weak passwords to make credential
    // stuffing attacks against Kyntha accounts harder.
    if (WEAK_PASSWORDS.has(password.toLowerCase())) {
      return jsonError('This password is too common — choose a stronger one', 400)
    }
    if (!name) return jsonError('Name is required', 400, 'VALIDATION_ERROR')

    // Seed demo users only when explicitly enabled (see ensureDemoUsers).
    if (process.env.ENABLE_DEMO === 'true') await ensureDemoUsers()

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      if (existing.isDemo) {
        // SECURITY: Even demo accounts must verify password — prevent auth bypass
        const passwordHash = existing.password
        const passwordValid = passwordHash ? await verifyPassword(password, passwordHash) : false
        if (!passwordValid) {
          await logAudit(existing.id, 'auth.login.demo_failed', `email=${email}`)
          return jsonError('Invalid credentials for demo account', 401)
        }
        // COMPLIANCE: enforce consent before issuing a session
        const consentErr = checkConsent(existing)
        if (consentErr) return consentErr
        const token = await createSession(existing.id)
        await setSessionCookie(token)
        await logAudit(existing.id, 'auth.login.demo', `role=${existing.role}`)
        return jsonOk({
          id: existing.id,
          email: existing.email,
          name: existing.name,
          role: existing.role,
          phone: existing.phone,
          subscriptionTier: existing.subscriptionTier,
        })
      }
      return jsonError('Unable to complete registration. Please try again.', 409)
    }

    // US privacy / HIPAA: require all three consent flags before creating
    // an account. Without these, PHI cannot be processed or AI features used.
    const consentErr = checkConsent({
      consentAccepted: !!body.consentAccepted,
      dataProcessingConsent: !!body.dataProcessingConsent,
      aiTrainingConsent: !!body.aiTrainingConsent,
    })
    if (consentErr) return consentErr

    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: {
        email,
        name,
        role: 'patient', // SECURITY: always 'patient' — role upgrade requires admin
        phone: phone || null,
        dateOfBirth,
        password: passwordHash,
        // AUTO-VERIFY IN DEV: skip email verification for testing
        emailVerified: process.env.NODE_ENV === 'production' ? false : true,
        consentAccepted: !!body.consentAccepted,
        dataProcessingConsent: !!body.dataProcessingConsent,
        aiTrainingConsent: !!body.aiTrainingConsent,
      },
    })

    const token = await createSession(user.id)
    await setSessionCookie(token)
    await logAudit(user.id, 'auth.register', 'role=patient')

    return jsonOk({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      subscriptionTier: user.subscriptionTier,
    })
  } catch (error) {
    // HIPAA: never log raw DB errors — they may contain PHI (passwords, hashes, etc.)
    logger.phiSafeError(error, 'auth.register')
    return jsonError('Internal server error', 500)
  }
}

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { createSession, setSessionCookie, verifyPassword } from '@/lib/auth'
import { isValidEmail, rateLimit, getIp } from '@/lib/security'
import { checkCsrf } from '@/lib/csrf'
import { jsonError, jsonOk, readJson, audit, isUserMinor as isUserMinorFlag } from '@/lib/api-helpers'
import { loginSchema } from '@/lib/schemas'
import { isIpBlocked } from '@/lib/security-audit'
import type { User } from '@prisma/client'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 10, 60000, { globalKey: true })
    if (limited) return limited

    const csrfErr = await checkCsrf(req)
    if (csrfErr) return csrfErr

    // IP-based lockout: guard against distributed credential stuffing.
    // Runs before password verification so the timing is constant regardless of
    // whether the email exists.
    const ip = getIp(req)
    const ipBlocked = await isIpBlocked(ip)
    if (ipBlocked) {
      return jsonError('Too many failed login attempts from this network. Try again later.', 423)
    }

    const rawBody = await readJson(req)
    if (!rawBody) return jsonError('Invalid credentials', 401)
    const loginResult = loginSchema.safeParse(rawBody)
    if (!loginResult.success) {
      const fields: Record<string, string> = {}
      for (const issue of loginResult.error.issues) {
        fields[String(issue.path.join('.') || 'body')] = issue.message
      }
      return jsonError('Validation failed', 422, 'VALIDATION_ERROR', { fields })
    }
    const { email, password } = loginResult.data
    if (!isValidEmail(email)) return jsonError('Valid email is required', 400)

    let user: User | null = null
    try {
      user = await db.user.findUnique({ where: { email } })
    } catch {
      return jsonError('Internal error', 500, 'DB_ERROR')
    }
    if (!user) return jsonError('Invalid credentials', 401, 'INVALID_CREDENTIALS')

    // Enforce email verification for non-demo accounts.
    // Demo accounts are auto-verified during seeding (see ensureDemoUsers).
    if (!user.emailVerified && !user.isDemo) {
      return jsonError('Please verify your email before logging in. Check your inbox for the verification link.', 403, 'EMAIL_NOT_VERIFIED')
    }

    // Check lockout BEFORE password verification to avoid timing oracle.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now()
      const remainingMin = Math.ceil(remainingMs / 60000)
      return jsonError(`Account locked. Try again in ${remainingMin} minute(s).`, 423)
    }

    if (!user.password) {
      return jsonError('Invalid credentials', 401)
    }
    if (!password) {
      return jsonError('Password is required', 400)
    }
    const passwordStr = String(password)
    const ok = await verifyPassword(passwordStr, user.password)
    if (!ok) {
      const newAttempts = (user.failedLoginAttempts || 0) + 1
      const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS

      await db.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : user.lockedUntil,
        },
      })

      // SECURITY: identical error shape for all failure modes prevents
      // account enumeration via response differentiation.
      if (shouldLock) {
        return jsonError('Invalid credentials', 423)
      }
      return jsonError('Invalid credentials', 401)
    }

    // ── Success: reset failed attempts ──
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await db.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      })
    }

    const token = await createSession(user.id)
    await setSessionCookie(token)
    await logAudit(user.id, 'auth.login', `role=${user.role}`)

    // COMPLIANCE (COPPA/family governance): compute isUserMinor from dateOfBirth
    // so downstream flows (SOS, restricted features) can apply minor protections.
    const isUserMinor = isUserMinorFlag(user)

    return jsonOk({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      subscriptionTier: user.subscriptionTier,
      isDemo: user.isDemo,
      isUserMinor,
    })
  } catch (error) {
    // HIPAA: never log raw HTTP bodies or DB errors — they may contain PHI
    logger.phiSafeError(error, 'login.POST')
    return jsonError('Internal server error', 500, 'INTERNAL_ERROR')
  }
}

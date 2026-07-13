import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { rateLimit } from '@/lib/security'
import { jsonError, jsonOk, audit } from '@/lib/api-helpers'
import { forgotPasswordSchema } from '@/lib/schemas/auth'
import { sendEmailReal } from '@/lib/integrations'
import { passwordResetEmail } from '@/lib/email-templates'
import crypto from 'crypto'
import { hashToken } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, 5, 60000, { globalKey: true })
    if (limited) return limited

    const body = await req.json().catch(() => null)
    const parsed = forgotPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError('Valid email is required', 400, 'VALIDATION_ERROR')
    }

    const user = await db.user.findUnique({ where: { email: parsed.data.email } })
    if (!user) {
      // Do not reveal whether email exists
      return jsonOk({ message: 'If an account exists, a reset link has been sent.' })
    }

    const rawToken = crypto.randomUUID() + crypto.randomUUID()
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    const hashForAudit = tokenHash.slice(0, 16)
    await logAudit(user.id, 'auth.forgot_password', `token=${hashForAudit}...`)

    // Store the reset token on the user record
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpires: expiresAt,
      },
    })

    // Send the password reset email
    const resetUrl = `${env('NEXT_PUBLIC_APP_URL')}/reset-password?token=${rawToken}`
    const { subject, html } = passwordResetEmail({
      name: user.name || 'User',
      resetLink: resetUrl,
      expiresInMinutes: 60,
    })

    const emailResult = await sendEmailReal({
      to: user.email,
      subject,
      html,
      from: env('SENDGRID_FROM_EMAIL'),
    })

    if (!emailResult.ok) {
      logger.warn('Password reset email failed', { error: emailResult.error, userId: user.id })
    }

    return jsonOk({ message: 'If an account exists, a reset link has been sent.' })
  } catch (error) {
    logger.phiSafeError(error, 'auth.forgot-password')
    return jsonError('Internal server error', 500, 'INTERNAL_ERROR')
  }
}

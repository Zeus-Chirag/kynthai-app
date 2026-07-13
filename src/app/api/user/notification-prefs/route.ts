import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAuthWithCsrf, jsonError, jsonOk } from '@/lib/api-helpers'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { logAudit } from '@/lib/auth'
import { z } from 'zod'
export const dynamic = 'force-dynamic'

// PATCH /api/user/notification-prefs
// Update per-channel notification preference toggles.
// Requires authenticated CSRF-verified session. All fields are optional
// (partial update).
const notificationPrefsSchema = z.object({
  reminders:   z.boolean().optional(),
  labResults:  z.boolean().optional(),
  emergency:   z.boolean().optional(),
  insights:    z.boolean().optional(),
  family:      z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!

  const raw = await req.text().catch(() => null)
  if (!raw) return jsonError('Request body is required', 400)

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return jsonError('Invalid JSON', 400)
  }

  const result = notificationPrefsSchema.safeParse(parsed)
  if (!result.success) {
    const fields: Record<string, string> = {}
    for (const issue of result.error.issues) {
      fields[issue.path.join('.')] = issue.message
    }
    return jsonError('Validation failed', 422, 'VALIDATION_ERROR', { fields })
  }

  const updates = result.data
  const updateKeys = Object.keys(updates)
  if (updateKeys.length === 0) {
    return jsonError('Provide at least one preference to update', 400)
  }

  try {
    // Read current prefs so we can merge partial updates
    // @ts-ignore - Prisma types not regenerated; field added in schema.prisma
    const currentPrefs = (user as any).notificationPrefs
      ? JSON.parse((user as any).notificationPrefs)
      : {
          reminders:  true,
          labResults: true,
          emergency:  true,
          insights:   true,
          family:     true,
        }

    const mergedPrefs = { ...currentPrefs, ...updates }

    const updated = await db.user.update({
      where: { id: user.id },
      // @ts-ignore - Prisma types not regenerated yet
      data: { notificationPrefs: JSON.stringify(mergedPrefs) },
      // @ts-ignore
      select: { id: true, notificationPrefs: true },
    })

    await logAudit(user.id, 'notification_prefs.update', updateKeys.join(', '))

    return jsonOk({
      preferences: {
        reminders:  mergedPrefs.reminders,
        labResults: mergedPrefs.labResults,
        emergency:  mergedPrefs.emergency,
        insights:   mergedPrefs.insights,
        family:     mergedPrefs.family,
      },
    })
  } catch (error) {
    logger.phiSafeError(error, 'notification-prefs.PATCH')
    return jsonError('Failed to update notification preferences', 500)
  }
}

// GET /api/user/notification-prefs
// Returns current notification preferences (with sensible defaults if not yet set).
export async function GET(req: NextRequest) {
  const { response, user } = await requireAuth(req)
  if (response || !user) return response!

  try {
    // @ts-ignore - Prisma types not regenerated; field added in schema.prisma
    const prefs = (user as any).notificationPrefs
      ? JSON.parse((user as any).notificationPrefs)
      : {
          reminders:  true,
          labResults: true,
          emergency:  true,
          insights:   true,
          family:     true,
        }

    return jsonOk({ preferences: prefs })
  } catch (error) {
    logger.phiSafeError(error, 'notification-prefs.GET')
    return jsonError('Failed to load notification preferences', 500)
  }
}

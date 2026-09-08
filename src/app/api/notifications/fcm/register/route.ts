import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { logAudit } from '@/lib/auth'
import { rateLimit } from '@/lib/security'
import { requireAuthWithCsrf, jsonOk, jsonError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/notifications/fcm/register
 * Register or update an FCM token for the authenticated user.
 * Called by the Android app on startup / token refresh.
 * Body: { token: string, platform: 'android' | 'ios' }
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 30, 60_000)
  if (limited) return limited

  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!

  const body = await req.json().catch(() => null)
  if (!body?.token || typeof body.token !== 'string') {
    return jsonError('Missing or invalid FCM token', 400)
  }

  const platform = body.platform === 'ios' ? 'ios' : 'android'
  const token = body.token.trim()

  try {
    // Upsert FCM token for this user
    await db.fcmToken.upsert({
      where: { userId_token: { userId: user.id, token } },
      create: {
        userId: user.id,
        token,
        platform,
        active: true,
      },
      update: {
        platform,
        active: true,
        updatedAt: new Date(),
      },
    })

    await logAudit(user.id, 'fcm.token.register', `platform=${platform}`)
    return jsonOk({ success: true })
  } catch (e) {
    console.error('[fcm/register] error', e)
    return jsonError('Failed to register FCM token', 500)
  }
}

/**
 * DELETE /api/notifications/fcm/register
 * Deactivate FCM token for the authenticated user (logout / push disabled).
 * Body: { token?: string } — if omitted, deactivates all tokens for user.
 */
export async function DELETE(req: NextRequest) {
  const limited = rateLimit(req, 30, 60_000)
  if (limited) return limited

  const { response, user } = await requireAuthWithCsrf(req)
  if (response || !user) return response!

  const body = await req.json().catch(() => ({}))

  try {
    if (body.token) {
      await db.fcmToken.updateMany({
        where: { userId: user.id, token: body.token },
        data: { active: false },
      })
    } else {
      await db.fcmToken.updateMany({
        where: { userId: user.id },
        data: { active: false },
      })
    }

    await logAudit(user.id, 'fcm.token.unregister', body.token ? 'single' : 'all')
    return jsonOk({ success: true })
  } catch (e) {
    console.error('[fcm/register] delete error', e)
    return jsonError('Failed to unregister FCM token', 500)
  }
}
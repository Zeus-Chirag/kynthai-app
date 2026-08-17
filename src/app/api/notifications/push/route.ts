import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { requireSystemToken, jsonOk, jsonError } from '@/lib/api-helpers'
import webpush from 'web-push'

export const dynamic = 'force-dynamic'

/**
 * POST /api/notifications/push — send push notifications to users.
 *
 * Called by:
 *  - /api/reminders/schedule (cron, when a reminder is due)
 *  - Appointment booking flow (consultation alerts)
 *  - Lab result upload flow (result-ready alerts)
 *
 * Body: { title, body, tag?, userId?, url? }
 * If userId is provided, sends to that user only.
 * If omitted, sends to all users with push subscriptions.
 */
export async function POST(req: NextRequest) {
  const { response } = await requireSystemToken(req)
  if (response) return response

  const body = await req.json().catch(() => null)
  if (!body?.title || !body?.body) {
    return jsonError('Missing title or body', 400)
  }

  // Configure VAPID
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    logger.phiSafeError(new Error('VAPID keys not configured'), 'push.vapid-missing')
    return jsonError('Push notifications not configured', 503)
  }

  webpush.setVapidDetails(
    'mailto:hello@kynthai.app',
    publicKey,
    privateKey
  )

  const title = body.title
  const payload = JSON.stringify({
    title,
    body: body.body,
    tag: body.tag || 'kynthai-notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: body.url || '/' },
  })

  // Fetch target subscriptions
  const where = body.userId
    ? { userId: body.userId }
    : {}

  try {
    const subs = await db.pushSubscription.findMany({
      where,
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    })

    let sent = 0
    let failed = 0

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
        sent++
      } catch (err: any) {
        failed++
        // 404/410 = subscription expired → remove it
        if (err.statusCode === 404 || err.statusCode === 410) {
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        } else {
          logger.phiSafeError(err, 'push.send')
        }
      }
    }

    return jsonOk({ sent, failed, total: subs.length })
  } catch (err) {
    logger.phiSafeError(err, 'push.send')
    return jsonError('Failed to send notifications', 500)
  }
}

import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

/**
 * FCM push — delivers notifications to Android/iOS native apps via Firebase Cloud Messaging.
 * Unlike VAPID web-push, FCM messages wake the device at the OS level, so notifications
 * arrive even when the app is fully closed (killed from recents).
 *
 * Env vars required (already set in Vercel):
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *
 * The private key is stored with escaped \n — we unescape before passing to the SDK.
 */

let messaging: ReturnType<typeof getMessaging> | null = null

function getFcmMessaging(): ReturnType<typeof getMessaging> | null {
  if (messaging) return messaging

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) return null

  try {
    // Firebase Admin SDK expects real newlines in the PEM key
    const unescapedKey = privateKey.replace(/\\n/g, '\n')

    // Reuse existing app if already initialized (warm lambda reuse)
    const app =
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: unescapedKey,
        }),
        projectId,
      })

    messaging = getMessaging(app)
    return messaging
  } catch (err) {
    logger.phiSafeError(err, 'fcm.init')
    return null
  }
}

/**
 * sendFcmToTokens — send an FCM push message to a list of device tokens.
 * Returns sent/failed counts. Never throws. Cleans up invalid tokens.
 */
export async function sendFcmToTokens(
  tokens: string[],
  payload: {
    title: string
    body: string
    tag?: string
    url?: string
    medName?: string
    time?: string
    dosage?: string
    reminderId?: string
  },
): Promise<{ sent: number; failed: number }> {
  const fcm = getFcmMessaging()
  if (!fcm || tokens.length === 0) return { sent: 0, failed: 0 }

  const message = {
    notification: {
      title: payload.title || 'Kynthai',
      body: payload.body || '',
      icon: '/icon-192.png',
    },
    data: {
      type: payload.tag || 'kynthai',
      url: payload.url || '/',
      medName: payload.medName || '',
      time: payload.time || '',
      dosage: payload.dosage || '',
      reminderId: payload.reminderId || '',
      tag: payload.tag || 'kynthai',
      requireInteraction: 'true',
    },
    android: {
      priority: 'high' as const,
      notification: {
        channelId: 'kynthai_fullscreen_dose_v2',
        priority: 'max' as const,
        sound: 'default',
        clickAction: 'OPEN_ACTIVITY_1',
        tag: payload.tag || 'kynthai',
        // Full-screen intent for dose alarms — wakes device even when screen is off
        ...(payload.tag === 'dose_alarm'
          ? { fullScreenIntent: true }
          : {}),
      },
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title: payload.title || 'Kynthai',
            body: payload.body || '',
          },
          sound: 'default',
          badge: 1,
          'content-available': 1,
          'mutable-content': 1,
        },
      },
      headers: {
        'apns-priority': '10',
        'apns-push-type': 'alert',
      },
    },
  }

  let sent = 0
  let failed = 0
  const invalidTokens: string[] = []

  // Send in batches of 500 (FCM multicast limit)
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500)
    try {
      const result = await fcm.sendEachForMulticast({
        tokens: batch,
        ...message,
      })

      sent += result.successCount
      failed += result.failureCount

      // Collect tokens that are permanently invalid
      result.responses.forEach((resp, idx) => {
        if (
          !resp.success &&
          resp.error &&
          (resp.error.code === 'messaging/registration-token-not-registered' ||
            resp.error.code === 'messaging/invalid-registration-token')
        ) {
          invalidTokens.push(batch[idx]!)
        }
      })
    } catch (err) {
      logger.phiSafeError(err, 'fcm.send')
      failed += batch.length
    }
  }

  // Clean up invalid tokens so we don't waste future sends
  if (invalidTokens.length > 0) {
    await db.fcmToken
      .updateMany({
        where: { token: { in: invalidTokens } },
        data: { active: false },
      })
      .catch(() => {})
  }

  return { sent, failed }
}

/**
 * sendFcmToUser — look up a user's active FCM tokens and send to all of them.
 * Convenience wrapper around sendFcmToTokens.
 */
export async function sendFcmToUser(
  userId: string,
  payload: {
    title: string
    body: string
    tag?: string
    url?: string
    medName?: string
    time?: string
    dosage?: string
    reminderId?: string
  },
): Promise<{ sent: number; failed: number }> {
  const fcm = getFcmMessaging()
  if (!fcm) return { sent: 0, failed: 0 }

  try {
    const tokens = await db.fcmToken.findMany({
      where: { userId, active: true },
      select: { token: true },
    })

    if (tokens.length === 0) return { sent: 0, failed: 0 }

    return await sendFcmToTokens(
      tokens.map((t) => t.token),
      payload,
    )
  } catch (err) {
    logger.phiSafeError(err, 'fcm.sendUser')
    return { sent: 0, failed: 0 }
  }
}

/**
 * isFcmConfigured — returns true when all FCM env vars are present.
 */
export function isFcmConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  )
}

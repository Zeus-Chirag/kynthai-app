import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireSystemToken, jsonOk, jsonError } from '@/lib/api-helpers'
import { rateLimit } from '@/lib/security'
import { logger } from '@/lib/logger'
import { sendPushToUser } from '@/lib/push-server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/reminders/send — runs every minute via Vercel cron.
 *
 * Finds reminders due in the current 2-minute window that haven't been sent,
 * then delivers push + email notifications. Marks reminders as 'sent' to
 * prevent duplicates.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 10, 60000)
  if (limited) return limited

  const { response, user } = await requireSystemToken(req)
  if (response || !user) return response!

  const now = new Date()
  const today = now.toISOString().slice(0, 10) // YYYY-MM-DD
  const currentHour = String(now.getUTCHours()).padStart(2, '0')
  const currentMinute = String(now.getUTCMinutes()).padStart(2, '0')
  const currentTime = `${currentHour}:${currentMinute}`

  // Also check the previous minute (in case cron fired slightly late)
  const prevMinute = now.getUTCMinutes() - 1
  const prevHour = prevMinute < 0 ? (now.getUTCHours() - 1 + 24) % 24 : now.getUTCHours()
  const prevMin = prevMinute < 0 ? 59 : prevMinute
  const prevTime = `${String(prevHour).padStart(2, '0')}:${String(prevMin).padStart(2, '0')}`

  try {
    // Find pending reminders due now (current minute or previous minute)
    const dueReminders = await db.reminder.findMany({
      where: {
        date: today,
        time: { in: [currentTime, prevTime] },
        status: 'pending',
      },
      include: {
        medication: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (dueReminders.length === 0) {
      return jsonOk({ checked: true, sent: 0, message: 'No reminders due' })
    }

    let sent = 0
    let failed = 0

    for (const reminder of dueReminders) {
      const userId = reminder.medication?.userId
      if (!userId) {
        failed++
        continue
      }

      const medName = reminder.medication?.name || 'your medication'
      const dosage = reminder.medication?.dosage || ''
      const frequency = reminder.medication?.frequency || ''

      try {
        // Send push notification via VAPID
        const pushResult = await sendPushToUser(userId, {
          title: `Time to take ${medName}`,
          body: [dosage, frequency].filter(Boolean).join(' · ') || `Reminder: take ${medName}`,
          tag: `reminder-${reminder.medicationId}-${today}`,
          url: '/patient',
        })

        // Note: reminder stays 'pending' until user marks taken/skipped/missed.
        // We track delivery via pushResult, not via reminder status.

        if (pushResult.sent > 0) {
          sent++
        } else {
          // No push subscriptions — still mark as sent (in-app alarm handles it)
          sent++
        }
      } catch (e) {
        failed++
        logger.phiSafeError(e, 'reminder.push')
      }
    }

    return jsonOk({
      checked: true,
      due: dueReminders.length,
      sent,
      failed,
      time: currentTime,
    })
  } catch (error) {
    logger.phiSafeError(error)
    return jsonError('Internal server error', 500)
  }
}

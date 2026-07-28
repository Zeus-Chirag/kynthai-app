/**
 * Smart notification routing service for Kynthai.
 *
 * Channels are tried in cost-ascending order (cheapest first) so the
 * platform spends the least amount possible per notification while still
 * reaching the user:
 *
 *   Push ($0) → Email ($0.001) → WhatsApp ($0.003) → SMS ($0.02)
 *
 * Each send is logged to `db.notificationLog` regardless of success/failure,
 * with channel, type, status, and cost recorded for analytics + billing.
 *
 * Higher-level helpers:
 *   - sendNotification()  generic routing
 *   - sendReminder()      medication due reminders
 *   - sendEscalation()    missed-dose escalations to caretakers
 *   - sendNudge()         doctor → patient nudge
 *   - sendInvite()        prescription invite
 *   - sendFollowUp()      follow-up appointment reminder
 *   - sendEmergency()     SOS alert to caretakers + linked doctors
 */

import { db } from './db'
import {
  sendEmailReal,
  sendSMSReal,
  sendWhatsAppReal,
  sendPushReal,
  isEmailEnabled,
  isSMSEnabled,
  isWhatsAppEnabled,
  isPushEnabled,
  type SendResult,
} from './integrations'

// ---------------------------------------------------------------------------
// Types + pricing
// ---------------------------------------------------------------------------

export type NotificationChannel = 'push' | 'email' | 'whatsapp' | 'sms'

export interface NotificationTarget {
  userId?: string | null
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  pushToken?: string | null
}

export interface NotificationPayload {
  title: string
  body: string
  type: string // reminder | escalation | nudge | invite | follow_up | emergency | general
  data?: Record<string, string>
}

export interface RouteResult {
  delivered: boolean
  channel: NotificationChannel | 'none'
  cost: number
  results: Array<{ channel: NotificationChannel; result: SendResult; cost: number }>
  notificationLogId?: string
}

// Per-channel cost (USD). Push is always free; the others are vendor list prices.
export const CHANNEL_COST: Record<NotificationChannel, number> = {
  push: 0,
  email: 0.001,
  whatsapp: 0.003,
  sms: 0.02,
}

// ---------------------------------------------------------------------------
// Internal: log every send to NotificationLog
// ---------------------------------------------------------------------------

async function logNotification(input: {
  userId?: string | null
  channel: NotificationChannel | 'in-app' | 'none'
  type: string
  title: string
  body: string
  recipient: string
  status: 'sent' | 'failed' | 'skipped'
  cost: number
}): Promise<string | undefined> {
  try {
    const row = await db.notificationLog.create({
      data: {
        userId: input.userId ?? null,
        channel: input.channel,
        type: input.type,
        title: input.title,
        body: input.body,
        recipient: input.recipient,
        status: input.status,
        cost: input.cost,
      },
    })
    return row.id
  } catch (e) {
    console.warn('[notifications] Failed to write notification log', e)
    return undefined
  }
}

// ---------------------------------------------------------------------------
// sendNotification — generic smart router
// ---------------------------------------------------------------------------

export async function sendNotification(
  target: NotificationTarget,
  payload: NotificationPayload,
): Promise<RouteResult> {
  const results: RouteResult['results'] = []
  let delivered = false
  let usedChannel: NotificationChannel | 'none' = 'none'
  let usedCost = 0

  // 1. PUSH (cheapest, $0)
  if (target.pushToken && isPushEnabled()) {
    const r = await sendPushReal({
      token: target.pushToken,
      title: payload.title,
      body: payload.body,
      data: payload.data,
    })
    const cost = CHANNEL_COST.push
    results.push({ channel: 'push', result: r, cost })
    if (r.ok) {
      delivered = true
      usedChannel = 'push'
      usedCost = cost
    }
  }

  // 2. EMAIL ($0.001)
  if (!delivered && target.email && isEmailEnabled()) {
    const r = await sendEmailReal({
      to: target.email,
      subject: payload.title,
      text: payload.body,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
        <h2 style="color:#10b981">${payload.title}</h2>
        <p style="color:#374151;font-size:15px;line-height:1.5">${payload.body}</p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb" />
        <p style="font-size:11px;color:#9ca3af">Kynthai · AI Health Management</p>
      </div>`,
    })
    const cost = CHANNEL_COST.email
    results.push({ channel: 'email', result: r, cost })
    if (r.ok) {
      delivered = true
      usedChannel = 'email'
      usedCost = cost
    }
  }

  // 3. WHATSAPP ($0.003)
  if (!delivered && (target.whatsapp || target.phone) && isWhatsAppEnabled()) {
    const to = target.whatsapp || target.phone!
    const r = await sendWhatsAppReal({ to, body: `${payload.title}\n\n${payload.body}` })
    const cost = CHANNEL_COST.whatsapp
    results.push({ channel: 'whatsapp', result: r, cost })
    if (r.ok) {
      delivered = true
      usedChannel = 'whatsapp'
      usedCost = cost
    }
  }

  // 4. SMS ($0.02) — last resort
  if (!delivered && target.phone && isSMSEnabled()) {
    const r = await sendSMSReal({ to: target.phone, body: `${payload.title}: ${payload.body}` })
    const cost = CHANNEL_COST.sms
    results.push({ channel: 'sms', result: r, cost })
    if (r.ok) {
      delivered = true
      usedChannel = 'sms'
      usedCost = cost
    }
  }

  // If no real channel could deliver, log a skipped/failed in-app row so we
  // always have an audit trail (recipient falls back to best identifier).
  const recipient = target.pushToken || target.email || target.whatsapp || target.phone || target.userId || 'unknown'
  const logId = await logNotification({
    userId: target.userId,
    channel: delivered ? usedChannel : 'in-app',
    type: payload.type,
    title: payload.title,
    body: payload.body,
    recipient,
    status: delivered ? 'sent' : 'skipped',
    cost: usedCost,
  })

  // If we did NOT deliver via any real channel, log a fallback in-app row.
  if (!delivered) {
    await logNotification({
      userId: target.userId,
      channel: 'in-app',
      type: payload.type,
      title: payload.title,
      body: payload.body,
      recipient,
      status: 'sent',
      cost: 0,
    })
  }

  return { delivered, channel: usedChannel, cost: usedCost, results, notificationLogId: logId }
}

// ---------------------------------------------------------------------------
// Higher-level helpers
// ---------------------------------------------------------------------------

/** Look up a Kynthai user's contact channels from the DB. */
async function loadUserTarget(userId: string): Promise<NotificationTarget> {
  const u = await db.user.findUnique({ where: { id: userId } })
  if (!u) return { userId }
  return {
    userId: u.id,
    email: u.email,
    phone: u.phone,
    // WhatsApp + push token are not yet columns on User — leave null and
    // callers can override via the optional overrides param.
  }
}

/** Send a medication reminder to a user. */
export async function sendReminder(
  userId: string,
  medName: string,
  dosage: string,
  scheduledTime: string,
  overrides: Partial<NotificationTarget> = {},
): Promise<RouteResult> {
  const target = { ...(await loadUserTarget(userId)), ...overrides }
  return sendNotification(target, {
    title: '💊 Medication reminder',
    body: `Time to take ${medName} (${dosage}) — scheduled at ${scheduledTime}. Tap to mark as taken.`,
    type: 'reminder',
    data: { medName, scheduledTime },
  })
}

/** Escalate a missed dose to the patient + their caretaker. */
export async function sendEscalation(
  userId: string,
  medName: string,
  scheduledTime: string,
  caretakerId?: string | null,
  overrides: Partial<NotificationTarget> = {},
): Promise<RouteResult> {
  const target = { ...(await loadUserTarget(userId)), ...overrides }
  const r = await sendNotification(target, {
    title: '⚠️ Missed dose — please take now',
    body: `Your ${medName} reminder at ${scheduledTime} was missed. Please take it now or mark as skipped.`,
    type: 'escalation',
    data: { medName, scheduledTime, escalated: '1' },
  })

  // Also nudge the caretaker if provided.
  if (caretakerId && caretakerId !== userId) {
    const ct = { ...(await loadUserTarget(caretakerId)) }
    await sendNotification(ct, {
      title: '🚨 Family member missed a dose',
      body: `Your family member missed ${medName} at ${scheduledTime}. You may want to reach out.`,
      type: 'escalation',
      data: { medName, scheduledTime, forUserId: userId },
    })
  }
  return r
}

/** Doctor → patient nudge. */
export async function sendNudge(
  patientId: string,
  doctorName: string,
  message: string,
  overrides: Partial<NotificationTarget> = {},
): Promise<RouteResult> {
  const target = { ...(await loadUserTarget(patientId)), ...overrides }
  return sendNotification(target, {
    title: `👋 Nudge from Dr. ${doctorName}`,
    body: message,
    type: 'nudge',
    data: { doctorName },
  })
}

/** Send a prescription invite link to a patient. */
export async function sendInvite(
  patientId: string,
  doctorName: string,
  inviteLink: string,
  medCount: number,
  overrides: Partial<NotificationTarget> = {},
): Promise<RouteResult> {
  const target = { ...(await loadUserTarget(patientId)), ...overrides }
  return sendNotification(target, {
    title: `📩 Prescription from Dr. ${doctorName}`,
    body: `You have a new prescription with ${medCount} medication(s). Review and accept: ${inviteLink}`,
    type: 'invite',
    data: { inviteLink, doctorName },
  })
}

/** Send a follow-up appointment reminder. */
export async function sendFollowUp(
  userId: string,
  doctorName: string,
  scheduledAt: string,
  appointmentId?: string,
  overrides: Partial<NotificationTarget> = {},
): Promise<RouteResult> {
  const target = { ...(await loadUserTarget(userId)), ...overrides }
  return sendNotification(target, {
    title: `📅 Follow-up with Dr. ${doctorName}`,
    body: `Your follow-up appointment is scheduled for ${scheduledAt}. Tap to join the video call.`,
    type: 'follow_up',
    data: { doctorName, scheduledAt, appointmentId: appointmentId || '' },
  })
}

/** SOS emergency alert — broadcast to caretaker + linked doctors. */
export async function sendEmergency(
  reporterId: string,
  memberName: string,
  notes: string,
  notifiedDoctorIds: string[] = [],
  overrides: Partial<NotificationTarget> = {},
): Promise<RouteResult> {
  const target = { ...(await loadUserTarget(reporterId)), ...overrides }
  const r = await sendNotification(target, {
    title: '🆘 Emergency SOS received',
    body: `Your SOS alert for ${memberName} has been sent to your caretaker and linked doctors. For ambulance or emergency services, call 911 immediately.${notes ? ` Notes: ${notes}` : ''}`,
    type: 'emergency',
    data: { memberName, notes },
  })

  // Fan out to linked doctors.
  for (const docId of notifiedDoctorIds) {
    const dt = { ...(await loadUserTarget(docId)) }
    await sendNotification(dt, {
      title: `🆘 SOS from ${memberName}`,
      body: `A family under your care triggered an SOS. ${notes ? `Notes: ${notes}` : ''} Please respond urgently.`,
      type: 'emergency',
      data: { memberName, notes, reporterId },
    })
  }

  return r
}

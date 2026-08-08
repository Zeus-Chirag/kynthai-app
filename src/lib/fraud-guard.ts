/**
 * Kynthai fraud PREVENTION guard.
 *
 * Detection (src/lib/fraud-checks.ts) flags suspicious activity AFTER it
 * happens. This guard is the enforcement layer: it DECIDES whether a person
 * is allowed in at the entry gates (register / login / provider application)
 * and centralizes a durable, admin-managed BLOCK state so a fraudster is kept
 * out app-wide, not just flagged.
 *
 * Block state (no DB migration — reuses existing columns):
 *   User.verificationLevel = 'blocked'   (free-form String, default 'unverified')
 *   User.verificationRejectedReason      = human-readable block reason
 *
 * ponytail: IP/device fingerprinting is intentionally NOT used here — the app
 * has no persistent IP store (logAudit doesn't record ip), so a per-IP account
 * limit would be unreliable. The gate relies on signals it can verify against
 * the DB today: blocked identifiers, duplicate phone, disposable email.
 */

import { db } from '@/lib/db';
import { logAudit } from '@/lib/auth';

export const BLOCK_LEVEL = 'blocked';
export const UNBLOCK_LEVEL = 'unverified';

/** throwaway / disposable email providers (domain or subdomain suffix match). */
const DISPOSABLE_EMAIL_MARKERS = [
  'mailinator',
  'guerrillamail',
  '10minutemail',
  'tempmail',
  'temp-mail',
  'throwaway',
  'throwawaymail',
  'yopmail',
  'sharklasers',
  'spam4',
  'trash-mail',
  'trashmail',
  'getnada',
  'maildrop',
  'discard.email',
  'mohmal',
  'tempr.email',
  'emailondeck',
  'fakeinbox',
  'mailnesia',
  'mintemail',
  'mailcatch',
  'mytemp',
  '1secmail',
  'inboxes',
];

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  if (!domain) return false;
  return DISPOSABLE_EMAIL_MARKERS.some(marker => domain.includes(marker));
}

/** True when a Prisma user profile is hard-blocked. */
export function isUserBlocked(profile: { verificationLevel?: string | null } | null | undefined): boolean {
  return !!profile && profile.verificationLevel === BLOCK_LEVEL;
}

export type EnrollmentVerdict =
  | { allowed: true }
  | { allowed: false; code: 'ACCOUNT_BLOCKED' | 'PHONE_IN_USE' | 'DISPOSABLE_EMAIL'; message: string };

/**
 * Enrollment gate — run BEFORE creating a new account.
 * Returns a block verdict when the person looks like a fraudster.
 */
export async function checkEnrollmentGate(input: {
  email: string;
  phone?: string | null;
}): Promise<EnrollmentVerdict> {
  const email = input.email.toLowerCase().trim();

  // 1. Disposable / throwaway email.
  if (isDisposableEmail(email)) {
    await logAudit('system', 'fraud.gate', `email=${email} rule=disposable`, 'security');
    return {
      allowed: false,
      code: 'DISPOSABLE_EMAIL',
      message: 'Registration is not available for this email address.',
    };
  }

  // 2. Blocked identity — email or phone already tied to a hard-blocked account.
  const blockedMatch = await db.user.findFirst({
    where: {
      deletedAt: null,
      verificationLevel: BLOCK_LEVEL,
      OR: [{ email }, ...(input.phone ? [{ phone: input.phone }] : [])],
    },
    select: { id: true, email: true, phone: true },
  });
  if (blockedMatch) {
    await logAudit('system', 'fraud.gate', `email=${email} rule=blocked_identity`, 'security');
    return {
      allowed: false,
      code: 'ACCOUNT_BLOCKED',
      message: 'This account is not eligible to register.',
    };
  }

  // 3. Duplicate phone on an active account — the classic multi-account fraud
  //    signal (same phone, many accounts). Reject new registrations that reuse
  //    a phone already in use.
  if (input.phone) {
    const phoneUser = await db.user.findFirst({
      where: { deletedAt: null, phone: input.phone, verificationLevel: { not: BLOCK_LEVEL } },
      select: { id: true, email: true },
    });
    if (phoneUser && phoneUser.email !== email) {
      await logAudit('system', 'fraud.gate', `email=${email} rule=duplicate_phone`, 'security');
      return {
        allowed: false,
        code: 'PHONE_IN_USE',
        message: 'This phone number is already in use on another account.',
      };
    }
  }

  return { allowed: true };
}

/** Persist a hard block on a user (by id or email). Admin-only call. */
export async function blockUser(
  adminId: string,
  target: { userId?: string; email?: string },
  reason: string
): Promise<boolean> {
  const existing = await db.user.findFirst({
    where: {
      deletedAt: null,
      OR: [{ id: target.userId ?? undefined }, { email: target.email?.toLowerCase() ?? undefined }],
    },
    select: { id: true, email: true },
  });
  if (!existing) return false;
  const note = `${reason} (blocked by admin ${adminId})`;
  await db.user.update({
    where: { id: existing.id },
    data: { verificationLevel: BLOCK_LEVEL, verificationRejectedReason: note },
  });
  await logAudit(adminId, 'admin.user.block', `user=${existing.id} reason=${reason}`, 'security');
  return true;
}

/** Lift a hard block. Admin-only call. */
export async function unblockUser(adminId: string, userId: string): Promise<boolean> {
  const existing = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!existing) return false;
  await db.user.update({
    where: { id: userId },
    data: { verificationLevel: UNBLOCK_LEVEL, verificationRejectedReason: null },
  });
  await logAudit(adminId, 'admin.user.unblock', `user=${userId}`, 'security');
  return true;
}

/** List currently hard-blocked users (admin view). */
export async function getBlockedUsers() {
  return db.user.findMany({
    where: { verificationLevel: BLOCK_LEVEL, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      verificationRejectedReason: true,
      isDemo: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  });
}
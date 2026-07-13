import { db } from './db'

export type FamilyMemberRole = 'owner' | 'caretaker' | 'viewer' | 'patient'

export interface FamilyAuthContext {
  familyId: string
  memberRole: FamilyMemberRole
  memberId: string
  familyName: string
}

/**
 * Resolve the caller's family context from the DB.
 * Returns null if the user is not a member of any family.
 */
export async function resolveFamilyContext(
  userId: string
): Promise<FamilyAuthContext | null> {
  // Check if user owns a family
  const ownedFamily = await db.family.findFirst({
    where: { ownerId: userId },
    select: { id: true, name: true },
  })

  if (ownedFamily) {
    const memberRecord = await db.familyMember.findFirst({
      where: { familyId: ownedFamily.id, userId },
      select: { id: true, role: true },
    })
    return {
      familyId: ownedFamily.id,
      memberRole: (memberRecord?.role as FamilyMemberRole) ?? 'owner',
      memberId: memberRecord?.id ?? '',
      familyName: ownedFamily.name,
    }
  }

  // Check if user is a member (not owner) of any family
  const membership = await db.familyMember.findFirst({
    where: { userId },
    include: {
      family: {
        select: { id: true, name: true },
      },
    },
  })

  if (membership && membership.familyId) {
    return {
      familyId: membership.familyId,
      memberRole: (membership.role as FamilyMemberRole) ?? 'viewer',
      memberId: membership.id,
      familyName: membership.family.name,
    }
  }

  return null
}

/**
 * Assert that the user has access to a family. Returns the context or an error descriptor.
 */
export async function assertFamilyAccess(
  userId: string
): Promise<FamilyAuthContext | { error: 'NO_FAMILY' | 'NOT_MEMBER'; status: number }> {
  const ctx = await resolveFamilyContext(userId)
  if (!ctx) return { error: 'NO_FAMILY', status: 404 }
  return ctx
}

/**
 * Check if a family member role has a specific permission.
 */
export function familyMemberHasPermission(
  role: FamilyMemberRole,
  permission: 'read' | 'write' | 'manage_members' | 'delete' | 'view_sensitive'
): boolean {
  const permissions: Record<FamilyMemberRole, Set<string>> = {
    owner:      new Set(['read', 'write', 'manage_members', 'delete', 'view_sensitive']),
    caretaker:  new Set(['read', 'write', 'view_sensitive']),
    viewer:     new Set(['read']),
    patient:    new Set(['read', 'write']),
  }
  return permissions[role]?.has(permission) ?? false
}

/**
 * Verify a relationship verification token for a family member invite.
 * Used during invite accept to validate the guardian/patient relationship.
 */
export async function verifyRelationshipToken(
  memberId: string,
  token: string
): Promise<boolean> {
  if (!token || token.length < 32) return false
  const member = await db.familyMember.findUnique({
    where: { id: memberId },
  })
  if (!member) return false
  const m = member as unknown as Record<string, string | null>
  return m.inviteToken === token || m.relationVerificationToken === token
}

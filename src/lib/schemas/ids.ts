import { z } from 'zod'

// Prisma model ids default to cuid() (e.g. FamilyMember, Medication, Family,
// DoctorProfile), while legacy prod rows are UUIDs. Validating ids as .uuid()
// alone made real cuid ids fail with 400/422 (family-member meds, doctor
// queries, invite accept). Accept both.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CUID_RE = /^c[0-9a-z]{24}$/i

export function dbIdWithMessage(message: string) {
  return z.string().refine((v) => UUID_RE.test(v) || CUID_RE.test(v), message)
}

export const dbId = dbIdWithMessage('Invalid id')
export const dbIdOptional = dbId.optional().nullable()

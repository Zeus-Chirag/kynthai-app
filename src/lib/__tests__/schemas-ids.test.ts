import { describe, it, expect } from 'vitest'
import { dbId, dbIdOptional } from '@/lib/schemas/ids'
import { createMedicationSchema, medicationsQuerySchema } from '@/lib/schemas/medications'
import { appointmentsQuerySchema } from '@/lib/schemas/appointments'

const CUID = 'cmspk049h0010kxk7fceyiy09'
const UUID = '7370250b-5253-4b98-85a7-e995b0b470aa'

describe('dbId', () => {
  it('accepts cuid ids (Prisma default) and legacy uuid ids', () => {
    expect(dbId.safeParse(CUID).success).toBe(true)
    expect(dbId.safeParse(UUID).success).toBe(true)
  })

  it('rejects junk', () => {
    expect(dbId.safeParse('nope').success).toBe(false)
    expect(dbId.safeParse('').success).toBe(false)
  })

  it('createMedicationSchema accepts a cuid familyMemberId (family meds were 422)', () => {
    const r = createMedicationSchema.safeParse({
      name: 'X', dosage: '1mg', times: ['08:00'], familyMemberId: CUID,
    })
    expect(r.success).toBe(true)
  })

  it('medicationsQuerySchema accepts a cuid familyMemberId (listing was 400)', () => {
    expect(medicationsQuerySchema.safeParse({ familyMemberId: CUID }).success).toBe(true)
  })

  it('appointmentsQuerySchema accepts a cuid doctorId (DoctorProfile is cuid)', () => {
    expect(appointmentsQuerySchema.safeParse({ doctorId: CUID }).success).toBe(true)
  })

  it('dbIdOptional allows null/undefined', () => {
    expect(dbIdOptional.safeParse(null).success).toBe(true)
    expect(dbIdOptional.safeParse(undefined).success).toBe(true)
  })
})

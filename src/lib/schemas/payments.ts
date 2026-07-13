import { z } from 'zod'

/** POST /api/payments — create a payment intent */
export const createPaymentSchema = z.object({
  type:        z.enum(['subscription','doctor_pro_subscription','consultation','generic']).optional().default('generic'),
  amount:      z.number().positive('Amount must be greater than 0').max(1_000_000, 'Amount exceeds maximum').refine(v => Number.isFinite(v), 'Amount must be a valid number'),
  currency:    z.string().length(3, 'Currency must be a 3-letter ISO code, e.g. USD, INR').optional().default('USD'),
  description: z.string().max(300).optional().nullable(),
})

/** POST /api/payments/checkout — confirm a payment */
export const checkoutSchema = z.object({
  paymentId:   z.string().uuid('paymentId must be a valid UUID'),
  providerRef: z.string().max(100).optional().nullable(),
})

/** GET /api/payments — query parameters */
export const paymentsQuerySchema = z.object({
  status:  z.enum(['pending','succeeded','failed','cancelled']).optional(),
  cursor:  z.string().optional(),
  limit:   z.coerce.number().int().min(1).max(100).optional().default(20),
  fields:  z.string().optional(),
})

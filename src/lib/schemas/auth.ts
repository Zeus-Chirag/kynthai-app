import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Valid email is required').max(254),
  password: z.string().min(1, 'Password is required').max(200),
})

export const registerSchema = z.object({
  email:    z.string().email('Valid email is required').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  name:     z.string().min(1, 'Name is required').max(120),
  phone:    z.string().regex(/^\+[1-9]\d{6,14}$/, 'Phone must be E.164, e.g. +15551234567').optional().nullable(),
  dateOfBirth: z.string(),
  consentAccepted:         z.boolean().optional().default(false),
  dataProcessingConsent:   z.boolean().optional().default(false),
  aiTrainingConsent:       z.boolean().optional().default(false),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email is required').max(254),
})

export const resetPasswordSchema = z.object({
  token:    z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
})

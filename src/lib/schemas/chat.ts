import { z } from 'zod'

const MAX_MSG_LEN = 4000

/** POST /api/chat — send a message */
export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(MAX_MSG_LEN, `Message too long (max ${MAX_MSG_LEN} characters)`),
})

/** GET /api/chat — query parameters */
export const chatQuerySchema = z.object({
  cursor: z.string().optional(),        // ISO date — fetch messages BEFORE this
  limit:  z.coerce.number().int().min(1).max(200).optional().default(50),
  fields: z.string().optional(),
})

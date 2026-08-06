import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/security';
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const newsletterSchema = z.object({
  email: z.string().email('Valid email is required').max(200),
  source: z.enum(['landing', 'pricing', 'footer', 'other']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 5, 60000, { globalKey: true });
    if (limited) return limited;

    const rawBody = await readJson(req);
    if (!rawBody) return jsonError('Invalid JSON', 400, 'INVALID_JSON');

    const result = newsletterSchema.safeParse(rawBody);
    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fields[String(issue.path.join('.') || 'body')] = issue.message;
      }
      return jsonError('Validation failed', 422, 'VALIDATION_ERROR', { fields });
    }

    const email = result.data.email.toLowerCase().trim();

    // Upsert: subscribing twice is a no-op, returns the existing row.
    await db.newsletterSubscriber.upsert({
      where: { email },
      update: {},
      create: { email, source: result.data.source ?? 'landing' },
    });

    return jsonOk({ message: 'Subscribed successfully' });
  } catch (error) {
    logger.phiSafeError(error, 'newsletter.POST');
    return jsonError('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

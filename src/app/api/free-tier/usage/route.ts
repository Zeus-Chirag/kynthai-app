import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { getFreeTierUsage, canAddMedication, canUseAI } from '@/lib/free-tier-guard';
import { applyStandardHeaders } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/free-tier/usage
 * Returns the free-tier usage counters for the current user.
 * Query: type=ai | type=medicine
 */
export async function GET(req: NextRequest) {
  const { response, user } = await requireAuth(req);
  if (response || !user) return response!;

  const type = req.nextUrl.searchParams.get('type') || 'medicine';
  const usage = await getFreeTierUsage(user.id);

  if (type === 'ai') {
    const canUse = await canUseAI(user.id);
    return applyStandardHeaders(
      NextResponse.json({ usedToday: usage.aiChatsUsed, limit: 1, canUse })
    );
  }

  const canAdd = await canAddMedication(user.id);
  return applyStandardHeaders(
    NextResponse.json({ usedToday: usage.medicinesAdded, limit: 1, canAdd })
  );
}

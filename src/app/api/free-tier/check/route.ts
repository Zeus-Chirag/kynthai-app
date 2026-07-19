import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { canAddMedication, canUseAI } from '@/lib/free-tier-guard';
import { applyStandardHeaders } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/free-tier/check?feature=medicine|ai
 * Returns whether the free-tier user can use a feature today.
 */
export async function GET(req: NextRequest) {
  const { response, user } = await requireAuth(req);
  if (response || !user) return response!;

  const feature = req.nextUrl.searchParams.get('feature');

  if (feature === 'ai') {
    const allowed = await canUseAI(user.id);
    return applyStandardHeaders(
      NextResponse.json({ allowed, reason: allowed ? undefined : 'Daily AI limit reached' })
    );
  }

  if (feature === 'medicine') {
    const allowed = await canAddMedication(user.id);
    return applyStandardHeaders(
      NextResponse.json({ allowed, reason: allowed ? undefined : 'Daily medication limit reached' })
    );
  }

  return applyStandardHeaders(NextResponse.json({ allowed: true }));
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/auth';
import { jsonError, jsonOk } from '@/lib/api-helpers';
import crypto from 'crypto';

const SESSION_COOKIE = 'kyntha_session';
const SESSION_TTL_DAYS = 30;

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return 'build-time-placeholder';
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL: SESSION_SECRET must be set in production.');
  }
  return 'kyntha-dev-only-do-not-use-in-production';
}

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return jsonError('Demo login disabled in production', 403, 'FORBIDDEN');
  }

  if (process.env.NEXT_PUBLIC_ENABLE_DEMO !== 'true') {
    return jsonError('Demo mode not enabled', 403, 'FORBIDDEN');
  }

  const user = await db.user.findFirst({
    where: { email: 'caretaker@kyntha.app', role: 'caretaker' },
  });

  if (!user) {
    return jsonError('Demo caretaker user not found', 500, 'NOT_FOUND');
  }

  const rawToken = crypto.randomUUID() + crypto.randomUUID();
  const hashedToken = crypto
    .createHmac('sha256', getSessionSecret())
    .update(rawToken)
    .digest('hex');

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + SESSION_TTL_DAYS);

  await db.user.update({
    where: { id: user.id },
    data: { sessionToken: hashedToken, sessionExpiry: expiry },
  });

  await logAudit(user.id, 'auth.demo-login', `role=${user.role}`);

  const res = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });

  res.cookies.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    expires: expiry,
    path: '/',
  });

  return res;
}
/**
 * Unit tests for session-signing: HMAC session tokens + Supabase JWT cookie
 * verification. The JWT case pins the H3 fix: an unverifiable (forged) cookie
 * must NEVER authenticate, including the legacy base64-JSON shape the old
 * middleware trusted blindly.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  signSessionToken,
  verifySessionToken,
  verifySupabaseJwt,
} from './session-signing';

afterEach(() => {
  vi.unstubAllEnvs();
});

const SECRET = 'test-supabase-jwt-secret-1234567890';

function base64UrlEncode(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function makeJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput))
  );
  return `${signingInput}.${base64UrlEncode(sig)}`;
}

function cookieValue(jwt: string): string {
  return 'base64-' + base64UrlEncode(jwt);
}

describe('session-signing', () => {
  it('round-trips sign/verify session tokens', async () => {
    const signed = await signSessionToken('user-123');
    expect(signed).toBeTruthy();
    await expect(verifySessionToken(signed!)).resolves.toBe('user-123');
  });

  it('rejects tampered session tokens', async () => {
    const signed = (await signSessionToken('user-123'))!;
    const tampered = signed.replace(/^user-123/, 'user-999');
    await expect(verifySessionToken(tampered)).resolves.toBeNull();
  });

  it('verifies a legitimately signed Supabase cookie and extracts the user id', async () => {
    const jwt = await makeJwt(
      { sub: 'victim-id', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 },
      SECRET
    );
    await expect(verifySupabaseJwt(cookieValue(jwt), SECRET)).resolves.toEqual({
      id: 'victim-id',
    });
  });

  it('rejects a raw dot-separated JWT (cookies must be base64- prefixed)', async () => {
    // Supabase stores cookies as `base64-<base64url(jwt)>`. A bare JWT string
    // contains `.` separators, which are not valid base64url — decoding fails
    // and the value must be treated as unauthenticated.
    const jwt = await makeJwt(
      { sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 },
      SECRET
    );
    await expect(verifySupabaseJwt(jwt, SECRET)).resolves.toBeNull();
  });

  it('rejects a forged cookie with an invalid signature', async () => {
    const jwt = await makeJwt({ sub: 'attacker-claimed-id', exp: 9999999999 }, 'wrong-secret');
    await expect(verifySupabaseJwt(cookieValue(jwt), SECRET)).resolves.toBeNull();
  });

  it('rejects the old forgeable base64-JSON shape (H3 regression)', async () => {
    const forged = 'base64-' + base64UrlEncode(JSON.stringify({ user: { id: 'victim-id' } }));
    await expect(verifySupabaseJwt(forged, SECRET)).resolves.toBeNull();
  });

  it('rejects expired tokens', async () => {
    const jwt = await makeJwt({ sub: 'user-1', exp: Math.floor(Date.now() / 1000) - 60 }, SECRET);
    await expect(verifySupabaseJwt(cookieValue(jwt), SECRET)).resolves.toBeNull();
  });

  it('fails closed on garbage input and empty secret', async () => {
    await expect(verifySupabaseJwt('not-a-cookie', SECRET)).resolves.toBeNull();
    await expect(verifySupabaseJwt('', SECRET)).resolves.toBeNull();
    await expect(verifySupabaseJwt('base64-abc', '')).resolves.toBeNull();
  });
});

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

// Real GoTrue cookies are `base64-` + base64url(JSON { access_token, ... }),
// NOT a bare JWT. Build one.
function envelopeCookie(jwt: string): string {
  return (
    'base64-' +
    base64UrlEncode(
      JSON.stringify({
        access_token: jwt,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'refresh-me',
        user: { id: 'envelope-user-id', role: 'authenticated' },
      })
    )
  );
}

async function makeEs256Keypair(
  kid?: string
): Promise<{ jwk: JsonWebKey & { kid?: string }; privateKey: CryptoKey }> {
  const kp = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  const jwk = (await crypto.subtle.exportKey('jwk', kp.publicKey!)) as JsonWebKey & {
    kid?: string;
  };
  if (kid) jwk.kid = kid;
  return { jwk, privateKey: kp.privateKey! };
}

async function makeEs256Jwt(
  payload: Record<string, unknown>,
  privateKey: CryptoKey,
  kid?: string
): Promise<string> {
  const header: Record<string, string> = { alg: 'ES256', typ: 'JWT' };
  if (kid) header.kid = kid;
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      privateKey,
      new TextEncoder().encode(signingInput)
    )
  );
  return `${signingInput}.${base64UrlEncode(sig)}`;
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

  it('rejects a raw dot-separated JWT string (dots are not valid base64url)', async () => {
    // A bare JWT contains `.` separators, which are not valid base64url — a
    // real cookie is `base64-` + base64url(...), so raw-JWT input must decode
    // as garbage and be treated as unauthenticated.
    const jwt = await makeJwt(
      { sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 },
      SECRET
    );
    await expect(verifySupabaseJwt(jwt, SECRET)).resolves.toBeNull();
  });

  it('verifies the real GoTrue envelope shape (base64- JSON with access_token)', async () => {
    const jwt = await makeJwt(
      { sub: 'real-session-id', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 },
      SECRET
    );
    await expect(verifySupabaseJwt(envelopeCookie(jwt), SECRET)).resolves.toEqual({
      id: 'real-session-id',
    });
  });

  it('rejects an envelope whose access_token was signed with the wrong secret', async () => {
    const jwt = await makeJwt({ sub: 'victim', exp: 9999999999 }, 'attacker-secret');
    await expect(verifySupabaseJwt(envelopeCookie(jwt), SECRET)).resolves.toBeNull();
  });

  it('verifies ES256 tokens (asymmetric-key projects) against the public JWK', async () => {
    const { jwk, privateKey } = await makeEs256Keypair();
    const jwt = await makeEs256Jwt(
      { sub: 'es256-user', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 },
      privateKey
    );
    await expect(verifySupabaseJwt(cookieValue(jwt), SECRET, jwk)).resolves.toEqual({
      id: 'es256-user',
    });
  });

  it('rejects ES256 tokens with a bad signature', async () => {
    const { jwk, privateKey } = await makeEs256Keypair();
    const other = await makeEs256Keypair();
    const jwt = await makeEs256Jwt(
      { sub: 'es256-user', exp: Math.floor(Date.now() / 1000) + 3600 },
      privateKey
    );
    // Verify with a DIFFERENT public key — must fail.
    await expect(verifySupabaseJwt(cookieValue(jwt), SECRET, other.jwk)).resolves.toBeNull();
  });

  it('rejects ES256 tokens whose kid does not match the configured key', async () => {
    const { jwk, privateKey } = await makeEs256Keypair('key-123');
    const jwt = await makeEs256Jwt(
      { sub: 'es256-user', exp: Math.floor(Date.now() / 1000) + 3600 },
      privateKey,
      'key-999'
    );
    await expect(verifySupabaseJwt(cookieValue(jwt), SECRET, jwk)).resolves.toBeNull();
  });

  it('fails closed on unknown algorithms (RS256/none)', async () => {
    const payload = { sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 };
    const signingInput = `${base64UrlEncode(JSON.stringify({ alg: 'RS256' }))}.${base64UrlEncode(JSON.stringify(payload))}`;
    const fake = `${signingInput}.${base64UrlEncode('fake-signature-bytes')}`;
    await expect(verifySupabaseJwt(cookieValue(fake), SECRET)).resolves.toBeNull();
    const none = `${base64UrlEncode(JSON.stringify({ alg: 'none' }))}.${base64UrlEncode(JSON.stringify(payload))}.`;
    await expect(verifySupabaseJwt(cookieValue(none), SECRET)).resolves.toBeNull();
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

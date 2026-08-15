import { NextRequest } from 'next/server';
import { requireAuth, applyStandardHeaders, jsonOk } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/turn-credentials
 *
 * Returns ephemeral ICE servers (STUN + TURN) for WebRTC video calls.
 *
 * Why this endpoint exists: TURN credentials were previously baked into the
 * client bundle as NEXT_PUBLIC_TURN_USERNAME / NEXT_PUBLIC_TURN_PASSWORD —
 * anyone could extract them from the JS and relay traffic through the TURN
 * server indefinitely. Now the client must be authenticated to fetch
 * credentials, and when TURN_SHARED_SECRET is configured the endpoint mints
 * time-limited REST credentials (RFC 8489 / coturn `use-auth-secret`:
 * username = expiry epoch, credential = base64url(HMAC-SHA1(secret, username)))
 * that expire after TURN_TTL_SECONDS (default 86400).
 *
 * Env resolution (server-only, never NEXT_PUBLIC_):
 *   TURN_URL                    — turn:host:port (falls back to NEXT_PUBLIC_TURN_URL)
 *   TURN_SHARED_SECRET          — REST secret → ephemeral credentials (preferred)
 *   TURN_USERNAME / TURN_PASSWORD — static credential, still served only over
 *                                   the authed API (fallback for plain coturn)
 *   TURN_TTL_SECONDS            — ephemeral validity, default 86400
 *
 * ponytail: ceiling — without TURN_SHARED_SECRET the fallback static
 * credentials are long-lived (just no longer public). Configure the shared
 * secret to get fully rotating credentials.
 */

function base64url(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function GET(req: NextRequest) {
  const { response } = await requireAuth(req);
  if (response) return response;

  const iceServers: Array<{
    urls: string;
    username?: string;
    credential?: string;
  }> = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const turnUrl = process.env.TURN_URL || process.env.NEXT_PUBLIC_TURN_URL || '';
  if (turnUrl) {
    const ttlSeconds = Math.max(300, Number(process.env.TURN_TTL_SECONDS || 86400));
    const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;

    if (process.env.TURN_SHARED_SECRET) {
      try {
        const key = await crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(process.env.TURN_SHARED_SECRET),
          { name: 'HMAC', hash: 'SHA-1' },
          false,
          ['sign']
        );
        const sig = new Uint8Array(
          await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(expiry)))
        );
        iceServers.push({
          urls: turnUrl,
          username: String(expiry),
          credential: base64url(sig),
        });
      } catch {
        // HMAC failure → no TURN rather than a broken credential
      }
    } else if (process.env.TURN_USERNAME && process.env.TURN_PASSWORD) {
      iceServers.push({
        urls: turnUrl,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_PASSWORD,
      });
    }
  }

  return applyStandardHeaders(jsonOk({ iceServers }));
}

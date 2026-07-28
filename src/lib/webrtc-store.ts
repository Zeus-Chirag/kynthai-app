/**
 * WebRTC Signaling Store — Redis-backed (Upstash) for multi-instance deployments.
 *
 * Falls back to in-memory Map when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 * are not configured (single-instance dev only).
 *
 * Message order: newest-first (LPUSH), capped at MAX_PER_ROOM per appointment room.
 */

import { Redis } from '@upstash/redis';

// ── Types ──────────────────────────────────────────────────────────

export type WebRTCSignalMessage = {
  id: string;
  appointmentId: string;
  role: 'doctor' | 'patient' | 'unknown';
  userId: string;
  userName: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: number;
};

// ── Config ─────────────────────────────────────────────────────────

const SIGNALING_PREFIX = 'kynthai:signal';
const MAX_PER_ROOM = 500;
const FALLBACK_PAGE_SIZE = 200;

// ── Redis client (HMR-safe singleton) ─────────────────────────────

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    redisClient = new Redis({ url, token });
  } catch {
    return null;
  }
  return redisClient;
}

// ── In-memory fallback (single-instance dev only) ──────────────────

const memStore = new Map<string, WebRTCSignalMessage[]>();
let memSeq = 0;

function memPush(msg: Omit<WebRTCSignalMessage, 'id' | 'createdAt'>): WebRTCSignalMessage {
  memSeq++;
  const full: WebRTCSignalMessage = {
    ...msg,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${memSeq}`,
    createdAt: Date.now(),
  };
  const list = memStore.get(msg.appointmentId) || [];
  list.push(full);
  if (list.length > MAX_PER_ROOM) {
    list.splice(0, list.length - MAX_PER_ROOM);
  }
  memStore.set(msg.appointmentId, list);
  return full;
}

function memList(appointmentId: string, afterId?: string): WebRTCSignalMessage[] {
  const list = memStore.get(appointmentId) || [];
  if (!afterId) return list.slice(-FALLBACK_PAGE_SIZE);
  const idx = list.findIndex(m => m.id === afterId);
  if (idx < 0) return [];
  return list.slice(idx + 1);
}

// ── Public API ─────────────────────────────────────────────────────
//
// All methods return Promises so callers don't need to know whether
// the store is backed by Redis or memory.

export const signalingStore = {
  /**
   * Append a new signaling message to the room, capped at MAX_PER_ROOM.
   */
  async push(message: Omit<WebRTCSignalMessage, 'id' | 'createdAt'>): Promise<WebRTCSignalMessage> {
    const redis = getRedisClient();
    if (redis) {
      memSeq++;
      const msg: WebRTCSignalMessage = {
        ...message,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${memSeq}`,
        createdAt: Date.now(),
      };
      const key = `${SIGNALING_PREFIX}:${message.appointmentId}`;
      await redis.lpush(key, JSON.stringify(msg));
      await redis.ltrim(key, 0, MAX_PER_ROOM - 1);
      // TTL: auto-expire empty rooms after 4 hours
      await redis.expire(key, 60 * 60 * 4);
      return msg;
    }
    return memPush(message);
  },

  /**
   * Get signaling messages for a room.
   * @param afterId — only return messages after this ID (polling cursor)
   */
  async list(appointmentId: string, afterId?: string): Promise<WebRTCSignalMessage[]> {
    const redis = getRedisClient();
    const key = `${SIGNALING_PREFIX}:${appointmentId}`;

    if (redis) {
      const raw = await redis.lrange(key, 0, -1);
      const all: WebRTCSignalMessage[] = raw.map(s => JSON.parse(s));
      if (!afterId) return all.slice(-FALLBACK_PAGE_SIZE);
      const idx = all.findIndex(m => m.id === afterId);
      if (idx < 0) return [];
      return all.slice(idx + 1);
    }
    return memList(appointmentId, afterId);
  },

  /**
   * Remove all messages for a room (call ended / room closed).
   */
  async clear(appointmentId: string): Promise<void> {
    const redis = getRedisClient();
    if (redis) {
      await redis.del(`${SIGNALING_PREFIX}:${appointmentId}`);
      return;
    }
    memStore.delete(appointmentId);
  },
};

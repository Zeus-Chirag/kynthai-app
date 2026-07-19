import { describe, it, expect } from 'vitest';
import { jsonOk, jsonError, applyStandardHeaders } from '../api-helpers';

describe('api-helpers', () => {
  describe('jsonOk', () => {
    it('returns 200 with JSON body', async () => {
      const res = jsonOk({ hello: 'world' });
      expect(res.status).toBe(200);
      expect(JSON.parse(await res.text())).toEqual({ hello: 'world' });
    });
  });

  describe('jsonError', () => {
    it('returns 400 with error payload', async () => {
      const res = jsonError('Bad input', 400, 'BAD_INPUT');
      const body = JSON.parse(await res.text());
      expect(res.status).toBe(400);
      expect(body.error).toBe('Bad input');
    });

    it('defaults to 400 when no status provided', async () => {
      expect(jsonError('Server error').status).toBe(400);
    });

    it('returns 500 when 500 is passed', async () => {
      const res = jsonError('Server error', 500);
      expect(res.status).toBe(500);
    });
  });

  describe('applyStandardHeaders', () => {
    it('sets security headers', async () => {
      const res = jsonOk({ ok: true });
      applyStandardHeaders(res);
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    });
  });
});

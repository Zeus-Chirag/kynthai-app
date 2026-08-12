/**
 * Check: offline-queue syncQueue CSRF replay.
 *
 * Asserts two behaviors:
 *  1. syncQueue fetches /api/auth/csrf once per batch and sends the fresh
 *     token as X-CSRF-Token on every replayed mutation.
 *  2. When the token fetch fails (still offline), the queue is left
 *     untouched — no retry burn, nothing dropped.
 *
 * Run: npx tsx scripts/check-offline-sync.ts
 */
import assert from 'node:assert'

// ── Stub browser globals BEFORE importing the module ──
const storage = new Map<string, string>()
;(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => { storage.set(k, v) },
  removeItem: (k: string) => { storage.delete(k) },
}
;(globalThis as Record<string, unknown>).navigator = { onLine: true }

type FetchCall = { url: string; headers?: Record<string, string>; method?: string }
let csrfMode: 'ok' | 'fail' = 'ok'
let csrfCalls = 0
const replayCalls: FetchCall[] = []

;(globalThis as Record<string, unknown>).fetch = async (url: unknown, init?: RequestInit) => {
  const u = String(url)
  if (u === '/api/auth/csrf') {
    csrfCalls++
    if (csrfMode === 'fail') return { ok: false, json: async () => ({}) }
    return { ok: true, json: async () => ({ token: 'csrf-fresh-token-123' }) }
  }
  replayCalls.push({
    url: u,
    method: init?.method,
    headers: (init?.headers ?? {}) as Record<string, string>,
  })
  return { ok: true, json: async () => ({}) }
}

async function main() {
  // Import AFTER stubs (module reads navigator/localStorage at top level).
  const { queueAction, syncQueue, getQueueActions } = await import('../src/lib/offline-queue')

  // ── Test 1: replay carries the fresh CSRF token ──
  queueAction({ method: 'POST', url: '/api/reminders', body: { status: 'taken' }, role: 'patient' })
  queueAction({ method: 'DELETE', url: '/api/medications/x', role: 'patient' })

  const r1 = await syncQueue()
  assert.deepStrictEqual(r1, { synced: 2, failed: 0 }, 'both actions should sync')
  assert.strictEqual(csrfCalls, 1, 'exactly one csrf fetch per batch')
  assert.strictEqual(replayCalls.length, 2, 'both replays issued')
  for (const call of replayCalls) {
    assert.strictEqual(
      call.headers?.['X-CSRF-Token'],
      'csrf-fresh-token-123',
      `replay of ${call.url} must carry the fresh CSRF token`
    )
  }
  assert.strictEqual(getQueueActions().length, 0, 'queue drained after successful sync')
  console.log('PASS test 1: replays carry fresh X-CSRF-Token, one csrf fetch per batch, queue drained')

  // ── Test 2: token fetch failure keeps the queue intact ──
  storage.clear()
  replayCalls.length = 0
  csrfCalls = 0
  csrfMode = 'fail'

  const a1 = queueAction({ method: 'POST', url: '/api/reminders', body: { status: 'taken' }, role: 'patient' })
  const a2 = queueAction({ method: 'POST', url: '/api/reminders', body: { status: 'skipped' }, role: 'patient' })

  const r2 = await syncQueue()
  assert.deepStrictEqual(r2, { synced: 0, failed: 0 }, 'no sync when token fetch fails')
  assert.strictEqual(csrfCalls, 1, 'csrf attempted once')
  assert.strictEqual(replayCalls.length, 0, 'no mutations replayed without a token')
  const left = getQueueActions()
  assert.strictEqual(left.length, 2, 'queue still holds both actions')
  assert.strictEqual(left[0]!.retries, a1.retries, 'retry counter untouched')
  assert.strictEqual(left[1]!.retries, a2.retries, 'retry counter untouched')
  console.log('PASS test 2: token-fetch failure leaves queue intact, no retry burn')

  console.log('ALL PASS')
}

main().catch((e) => {
  console.error('FAIL:', e instanceof Error ? e.message : e)
  process.exit(1)
})

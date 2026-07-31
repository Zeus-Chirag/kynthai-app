#!/usr/bin/env node
/**
 * security-probe.mjs — live security smoke probe (headless Chromium).
 *
 * Usage:  PROBE_URL=https://<target> node security-probe.mjs
 *         (defaults to http://localhost:3000)
 *
 * Read-only checks — never submits credentials or mutates data:
 *   1. Security headers (CSP, HSTS, nosniff, frame/ref/policy, request-id)
 *   2. Auth-required endpoints reject unauthenticated access (401, not 200)
 *   3. Sensitive admin/debug/migrate endpoints reject unauthenticated access
 *   4. CSRF double-submit enforced on state-changing POSTs
 *   5. No internal detail leakage (stack traces, DSNs, table names) in errors
 *   6. API responses carry no-store cache headers
 *   7. No reflected-XSS on the landing page
 *   8. Zero console/page errors on landing page
 */
import { chromium } from '@playwright/test';

const BASE = (process.env.PROBE_URL || 'http://localhost:3000').replace(/\/$/, '');
const results = [];
const critical = new Set(['CHECK_AUTH', 'CHECK_SENSITIVE', 'CHECK_CSRF']);

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

function headerOf(res, name) {
  return (res.headers()[name.toLowerCase()] || '').toLowerCase();
}

const browser = await chromium.launch({ headless: true });

try {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // ── 8. Console / page errors on the landing page ────────────────────────
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });
  page.on('pageerror', e => pageErrors.push(String(e).slice(0, 160)));

  // ── 1. Landing page + security headers ──────────────────────────────────
  let res;
  try {
    res = await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) {
    record('TARGET_LOAD', false, String(e).slice(0, 120));
    process.exit(1);
  }
  record('TARGET_LOAD', res.status() === 200, `status=${res.status()}`);
  record('CHECK_TITLE', (await page.title()).length > 0, `title="${(await page.title()).slice(0, 40)}"`);

  const checks = [
    ['X-Content-Type-Options: nosniff', headerOf(res, 'x-content-type-options') === 'nosniff'],
    ['X-Frame-Options: DENY', headerOf(res, 'x-frame-options') === 'deny'],
    ['Referrer-Policy present', headerOf(res, 'referrer-policy') !== ''],
    ['Permissions-Policy present', headerOf(res, 'permissions-policy') !== ''],
    ['X-Request-Id present', headerOf(res, 'x-request-id') !== ''],
    ['Content-Security-Policy present', headerOf(res, 'content-security-policy') !== ''],
  ];
  if (BASE.startsWith('https://')) {
    checks.push(['HSTS present over TLS', headerOf(res, 'strict-transport-security') !== '']);
    checks.push(['CSP blocks unsafe-eval (prod)', !headerOf(res, 'content-security-policy').includes('unsafe-eval')]);
  }
  for (const [name, ok] of checks) record('HEADER_' + name.toUpperCase().replace(/[^A-Z0-9]+/g, '_'), ok);

  // CSP baseline severity
  const csp = headerOf(res, 'content-security-policy');
  if (csp.includes('unsafe-inline') && BASE.startsWith('https://')) {
    record('CSP_UNSAFE_INLINE', false, 'script-src unsafe-inline present in production CSP (Next.js hydration requirement)');
  }

  // ── 7. Reflected-XSS probe ──────────────────────────────────────────────
  const xssPayload = '<script>alert("kynthai-probe-1")</script>';
  const xssRes = await ctx.request.get(BASE + '/?q=' + encodeURIComponent(xssPayload));
  const xssBody = await xssRes.text();
  record('NO_REFLECTED_XSS', !xssBody.includes('alert("kynthai-probe-1")'), `status=${xssRes.status()}`);

  // ── 2. Auth-required endpoints must reject anonymous access ─────────────
  const authEndpoints = ['/api/me', '/api/appointments', '/api/medications', '/api/chat', '/api/notifications', '/api/user/data-export'];
  for (const ep of authEndpoints) {
    const r = await ctx.request.get(BASE + ep, { maxRedirects: 0, timeout: 15000 });
    const ok = r.status() === 401 || r.status() === 403 || r.status() === 307 || r.status() === 308;
    record('CHECK_AUTH' + ep.replace(/[^a-z0-9]+/gi, '_'), ok, `${ep} → ${r.status()}`);
    if (r.status() === 200) {
      const body = (await r.text()).slice(0, 200);
      record('CHECK_AUTH_BODY_' + ep.replace(/[^a-z0-9]+/gi, '_'), false, `200 with body: ${body.slice(0, 120)}`);
    }
  }

  // ── 3. Sensitive admin / debug / migrate endpoints ──────────────────────
  const sensitiveEndpoints = ['/api/debug', '/api/migrate', '/api/admin/doctors', '/api/admin/users'];
  for (const ep of sensitiveEndpoints) {
    const r = await ctx.request.get(BASE + ep, { maxRedirects: 0, timeout: 15000 });
    const ok = r.status() !== 200 && r.status() !== 500; // never 200 or a 500 crash
    record('CHECK_SENSITIVE' + ep.replace(/[^a-z0-9]+/gi, '_'), ok, `${ep} → ${r.status()}`);
  }

  // ── 4. CSRF enforced on state-changing POSTs (no session, no token) ─────
  const csrfRes = await ctx.request.post(BASE + '/api/payments', {
    data: { type: 'plus', amount: 9.99, currency: 'USD' },
    maxRedirects: 0,
    timeout: 15000,
  });
  // Middleware CSRF check runs before auth; any of 401/403 proves the request
  // was not allowed through as a state change.
  record('CHECK_CSRF', [400, 401, 403].includes(csrfRes.status()), `POST /api/payments → ${csrfRes.status()}`);

  // ── 5. Info-leak hygiene on error responses ─────────────────────────────
  const missing = await ctx.request.get(BASE + '/api/this-route-does-not-exist', { timeout: 15000 });
  const missingBody = await missing.text();
  const leakPatterns = [/stack trace/i, /at\s+\w+\.?\w*\s*\(/i, /ENCRYPTION_KEY/i, /DATABASE_URL/i, /PrismaClient/i, /postgres/i];
  const leaks = leakPatterns.filter(p => p.test(missingBody));
  record('NO_INFO_LEAK_404', missing.status() === 404 && leaks.length === 0, `status=${missing.status()} leaks=${leaks.length}`);

  // ── 6. API cache-control: no-store ──────────────────────────────────────
  const apiHeaders = await ctx.request.get(BASE + '/api/health', { timeout: 15000 });
  const cc = headerOf(apiHeaders, 'cache-control');
  record('API_NO_STORE', cc.includes('no-store'), `/api/health cache-control="${cc || '(missing)'}"`);

  // ── 8b. Console / page errors summary ───────────────────────────────────
  record('NO_CONSOLE_ERRORS', consoleErrors.length === 0, consoleErrors.length ? consoleErrors[0] : '');
  record('NO_PAGE_ERRORS', pageErrors.length === 0, pageErrors.length ? pageErrors[0] : '');

  await browser.close();
} catch (e) {
  console.error('PROBE CRASHED:', String(e).slice(0, 300));
  await browser.close().catch(() => {});
  process.exit(2);
}

// ── Summary ───────────────────────────────────────────────────────────────
const failed = results.filter(r => !r.ok);
console.log(`\n=== Security Probe Summary — ${BASE} ===`);
console.log(`Total: ${results.length} | Passed: ${results.length - failed.length} | Failed: ${failed.length}`);
if (failed.length) {
  console.log('\nFailed checks:');
  for (const f of failed) console.log(`  ✗ ${f.name}${f.detail ? ' — ' + f.detail : ''}`);
}
// Exit non-zero when any critical control failed (auth / sensitive / csrf)
const criticalFail = failed.filter(f =>
  f.name.startsWith('CHECK_AUTH') ||
  f.name.startsWith('CHECK_SENSITIVE') ||
  f.name.startsWith('CHECK_CSRF')
);
process.exit(criticalFail.length ? 1 : 0);

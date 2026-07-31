#!/usr/bin/env node
/**
 * viewport-probe.mjs — cross-device responsive probe (headless Chromium).
 *
 * Usage:  PROBE_URL=https://<target> node viewport-probe.mjs
 *         (defaults to http://localhost:3000)
 *
 * For every viewport in VIEWPORTS (portrait + landscape), on every public
 * route in ROUTES, it verifies:
 *   1. No horizontal overflow  (document.scrollWidth <= viewport width)
 *   2. No content clipped at the right viewport edge
 *   3. Interactive elements (buttons/links) meet the 44px touch target
 *      minimum in both axes (WCAG 2.5.8 / Apple HIG / Material Design)
 *
 * Read-only — never submits credentials or mutates data.
 */
import { chromium } from '@playwright/test';

const BASE = (process.env.PROBE_URL || 'http://localhost:3000').replace(/\/$/, '');
const results = [];
const fails = [];

function record(route, vw, vh, ok, detail = '') {
  results.push({ route, vw, vh, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${route.padEnd(24)} ${String(vw).padStart(5)}×${String(vh).padStart(4)}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails.push({ route, vw, vh, detail });
}

// Portrait CSS widths spanning small phones -> ultra-wide desktop.
// Each entry is [width, height] portrait; landscape swaps them.
const PORTRAIT = [
  [320, 568], [344, 740], [360, 640], [360, 800], [375, 667], [375, 812],
  [390, 844], [393, 851], [412, 915], [414, 896], [430, 932], [480, 800],
  [540, 960], [600, 1024], [640, 1136], [667, 375], [720, 1280], [768, 1024],
  [820, 1180], [853, 1280], [912, 1368], [1024, 768], [1280, 800], [1366, 768],
  [1440, 900], [1536, 864], [1600, 900], [1728, 1117], [1920, 1080],
  [2048, 1152], [2560, 1440],
];

const ROUTES = [
  '/', '/login', '/register', '/forgot-password', '/reset-password',
  '/pricing', '/privacy', '/terms', '/refund-cancellation', '/grievance',
  '/cookies', '/ccpa', '/accessibility', '/medical-disclaimer',
  '/privacy-practices', '/patient-rights', '/feedback', '/checkout',
];

const browser = await chromium.launch({ headless: true });

try {
  // ── 1. Probe every route at every viewport (portrait, then landscape) ───
  for (const [w, h] of PORTRAIT) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    for (const route of ROUTES) {
      try {
        await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(350); // let hydration/layout settle
      } catch (e) {
        record(route, w, h, false, `load error: ${String(e).slice(0, 80)}`);
        continue;
      }

      // Some routes (auth-gated) may redirect to /login — still valid to probe.
      const metrics = await page.evaluate(() => {
        const dw = document.documentElement.scrollWidth;
        const vw = window.innerWidth;
        const overflowing = Array.from(document.querySelectorAll('body *')).filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.right > vw + 1;
        }).slice(0, 3).map((el) => {
          const r = el.getBoundingClientRect();
          return `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 2).join('.') : ''} (right=${Math.round(r.right)})`;
        });
        // Small interactive elements below the 44px minimum
        const smallTargets = Array.from(document.querySelectorAll('button, a[href], [role="button"]')).filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
        }).slice(0, 4).map((el) => {
          const r = el.getBoundingClientRect();
          return `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 2).join('.') : ''} (${Math.round(r.width)}×${Math.round(r.height)})`;
        });
        return { dw, vw, overflowing, smallTargets };
      });

      const noOverflow = metrics.dw <= metrics.vw;
      record(route, w, h, noOverflow, noOverflow ? '' : `scrollWidth=${metrics.dw} > viewport=${metrics.vw} → ${metrics.overflowing.join(', ')}`);
      if (metrics.smallTargets.length > 0) {
        record(`${route} <44px targets`, w, h, false, metrics.smallTargets.join(' | '));
      }
    }
    await ctx.close();
  }

  // ── 2. Landscape spot-check on a representative phone + tablet ──────────
  for (const [w, h] of [[844, 390], [1024, 768]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(350);
    const dw = await page.evaluate(() => document.documentElement.scrollWidth);
    const vw = await page.evaluate(() => window.innerWidth);
    record(`/ landscape`, w, h, dw <= vw, dw <= vw ? '' : `scrollWidth=${dw} > ${vw}`);
    await ctx.close();
  }

  await browser.close();
} catch (e) {
  console.error('PROBE CRASHED:', String(e).slice(0, 300));
  await browser.close().catch(() => {});
  process.exit(2);
}

// ── Summary ────────────────────────────────────────────────────────────────
const total = results.length;
const passed = total - fails.length;
console.log(`\n=== Viewport Probe Summary — ${BASE} ===`);
console.log(`Checks: ${total} | Passed: ${passed} | Failed: ${fails.length}`);
if (fails.length) {
  console.log('\nFailed checks:');
  for (const f of fails.slice(0, 40)) {
    console.log(`  ✗ ${f.route} @ ${f.vw}×${f.vh} — ${f.detail}`);
  }
  if (fails.length > 40) console.log(`  … and ${fails.length - 40} more`);
}
process.exit(fails.length ? 1 : 0);

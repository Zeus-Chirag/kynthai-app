#!/usr/bin/env node
/**
 * viewport-probe.mjs — cross-device responsive probe (headless Chromium).
 *
 * Usage:  PROBE_URL=https://<target> node viewport-probe.mjs
 *         (defaults to http://localhost:3000)
 *
 * Optional overrides:
 *   PROBE_ROUTES=/ ,/pricing       comma-separated route subset (default: all ROUTES)
 *   PROBE_VIEWPORTS=390x844,844x390  explicit viewport subset as WxH (default: all portrait + landscape spot-check)
 *   PROBE_STRICT_TOUCH=1           promote touch-target warnings to failures (affects exit code)
 *
 * For every viewport, on every route, it verifies:
 *   1. No horizontal overflow        (document.scrollWidth <= viewport width)
 *   2. No content clipped at the right viewport edge
 *   3. Touch targets per WCAG 2.5.8 (44px "enhanced" / 24px minimum + spacing):
 *        - targets >= 44x44 ............ pass
 *        - 24-44px targets ............. pass if the 2.5.8 SPACING EXCEPTION holds
 *          (a 24px circle centered on the bounding box intersects no other target);
 *          otherwise reported as a WARNING (non-blocking unless PROBE_STRICT_TOUCH=1)
 *        - inline text links ............ exempt (size constrained by line-height)
 *        - aria-hidden / pointer-events-none / disabled / aria-disabled /
 *          tabindex="-1" subtrees ...... skipped entirely (not interactive/decorative)
 *        - targets below 24px (non-inline) ... FAIL (no exception covers this)
 *
 * Read-only — never submits credentials or mutates data.
 */
import { chromium } from '@playwright/test';

const BASE = (process.env.PROBE_URL || 'http://localhost:3000').replace(/\/$/, '');
const STRICT_TOUCH = process.env.PROBE_STRICT_TOUCH === '1';

const results = [];
const fails = [];
const warns = [];

function record(route, vw, vh, ok, detail = '', marker = '') {
  results.push({ route, vw, vh, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${route.padEnd(22)} ${String(vw).padStart(5)}×${String(vh).padStart(4)}${marker}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails.push({ route, vw, vh, detail });
}

function warn(route, vw, vh, detail) {
  warns.push({ route, vw, vh, detail });
  console.log(`  WARN  ${route.padEnd(22)} ${String(vw).padStart(5)}×${String(vh).padStart(4)} — ${detail}`);
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

const ALL_ROUTES = [
  '/', '/login', '/register', '/forgot-password', '/reset-password',
  '/pricing', '/privacy', '/terms', '/refund-cancellation', '/grievance',
  '/cookies', '/ccpa', '/accessibility', '/medical-disclaimer',
  '/privacy-practices', '/patient-rights', '/feedback', '/checkout',
];

const ROUTES = process.env.PROBE_ROUTES
  ? process.env.PROBE_ROUTES.split(',').map((r) => r.trim()).filter(Boolean)
  : ALL_ROUTES;

const VIEWPORTS = process.env.PROBE_VIEWPORTS
  ? process.env.PROBE_VIEWPORTS.split(',').map((v) => {
      const [w, h] = v.trim().split('x').map(Number);
      return [w, h];
    })
  : PORTRAIT;

// Explicit PROBE_VIEWPORTS means the caller controls the matrix — skip the
// implied landscape spot-check below.
const LANDSCAPE_SPOT = process.env.PROBE_VIEWPORTS ? [] : [[844, 390], [1024, 768]];

let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch (e) {
  // Root containers (CI, this sandbox) need the setuid sandbox disabled.
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
}

/**
 * Run one viewport pass over `routes`. `landscape` only tweaks reporting.
 */
async function runPass(w, h, routes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const route of routes) {
    try {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(350); // let hydration/layout settle
    } catch (e) {
      record(route, w, h, false, `load error: ${String(e).slice(0, 80)}`);
      continue;
    }

    // Some routes (auth-gated) may redirect to /login — still valid to probe.
    const data = await page.evaluate(() => {
      const dw = document.documentElement.scrollWidth;
      const vw = window.innerWidth;
      const overflowing = Array.from(document.querySelectorAll('body *')).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > vw + 1;
      }).slice(0, 3).map((el) => {
        const r = el.getBoundingClientRect();
        return `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 2).join('.') : ''} (right=${Math.round(r.right)})`;
      });

      // ── Touch targets (WCAG 2.5.8) ────────────────────────────────────
      const els = Array.from(document.querySelectorAll('button, a[href], [role="button"]'));
      const targets = [];
      for (const el of els) {
        // Decorative / non-interactive subtrees are not real targets.
        if (el.closest('[aria-hidden="true"]')) continue;
        if (el.closest('.pointer-events-none')) continue;
        if (el.hasAttribute('disabled')) continue;
        if (el.getAttribute('aria-disabled') === 'true') continue;
        if (el.getAttribute('tabindex') === '-1') continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) targets.push({ el, r });
      }

      const describe = (el, r) =>
        `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 2).join('.') : ''} (${Math.round(r.width)}×${Math.round(r.height)})`;

      const findings = [];
      for (const { el, r } of targets) {
        const minDim = Math.min(r.width, r.height);
        if (minDim >= 44) continue; // meets the enhanced 44px minimum

        // Inline text links are exempt: their size is constrained by line-height
        // (WCAG 2.5.8 "Inline" exception).
        const inlineTextLink =
          el.tagName === 'A' &&
          !el.querySelector('img, svg, video, canvas, [role="img"]') &&
          el.textContent.trim().length > 0 &&
          el.textContent.trim().length < 80 &&
          el.closest('p, li, h1, h2, h3, h4, h5, h6, span, figcaption, blockquote');

        if (minDim < 24) {
          // Below the WCAG 2.5.8 floor — no exception exists (other than inline).
          if (inlineTextLink) {
            findings.push({ level: 'pass', text: `${describe(el, r)} — inline text link (2.5.8 exception)` });
            continue;
          }
          findings.push({ level: 'fail', text: `${describe(el, r)} — below 24px minimum (WCAG 2.5.8)` });
          continue;
        }

        // 24 <= minDim < 44 — spacing exception: a 24px circle centered on the
        // bounding box must not intersect another target (or another circle).
        const left = r.left - 12, right = r.right + 12, top = r.top - 12, bottom = r.bottom + 12;
        const intersects = targets.some(({ el: other, r: or }) => {
          if (other === el) return false;
          return or.left < right && or.right > left && or.top < bottom && or.bottom > top;
        });
        if (!intersects) {
          findings.push({ level: 'pass', text: `${describe(el, r)} — spacing exception satisfied` });
        } else {
          findings.push({ level: 'warn', text: `${describe(el, r)} — under 44px and spacing exception not met` });
        }
      }
      return { dw, vw, overflowing, touch: findings };
    });

    const noOverflow = data.dw <= data.vw;
    record(route, w, h, noOverflow, noOverflow ? '' : `scrollWidth=${data.dw} > viewport=${data.vw} → ${data.overflowing.join(', ')}`);

    const touchFails = data.touch.filter((t) => t.level === 'fail');
    const touchWarns = data.touch.filter((t) => t.level === 'warn');
    if (touchFails.length > 0) {
      record(`${route} [touch]`, w, h, false, touchFails.slice(0, 6).map((t) => t.text).join(' | '));
    }
    if (touchWarns.length > 0) {
      if (STRICT_TOUCH) {
        record(`${route} [touch]`, w, h, false, touchWarns.slice(0, 6).map((t) => t.text).join(' | '));
      } else {
        warn(route, w, h, touchWarns.slice(0, 6).map((t) => t.text).join(' | '));
      }
    }
  }
  await ctx.close();
}

try {
  // ── 1. Probe every route at every viewport ─────────────────────────────
  for (const [w, h] of VIEWPORTS) {
    await runPass(w, h, ROUTES);
  }

  // ── 2. Landscape spot-check on a representative phone + tablet ─────────
  for (const [w, h] of LANDSCAPE_SPOT) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(350);
    const dw = await page.evaluate(() => document.documentElement.scrollWidth);
    const vw = await page.evaluate(() => window.innerWidth);
    record('/ (landscape)', w, h, dw <= vw, dw <= vw ? '' : `scrollWidth=${dw} > ${vw}`);
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
console.log(`Checks: ${total} | Passed: ${passed} | Failed: ${fails.length} | Warned: ${warns.length}${STRICT_TOUCH ? ' (STRICT touch mode)' : ''}`);
if (warns.length > 0) {
  console.log('\nWarnings (touch targets — non-blocking; set PROBE_STRICT_TOUCH=1 to fail on them):');
  for (const f of warns.slice(0, 20)) {
    console.log(`  ! ${f.route} @ ${f.vw}×${f.vh} — ${f.detail}`);
  }
  if (warns.length > 20) console.log(`  … and ${warns.length - 20} more`);
}
if (fails.length > 0) {
  console.log('\nFailed checks:');
  for (const f of fails.slice(0, 40)) {
    console.log(`  ✗ ${f.route} @ ${f.vw}×${f.vh} — ${f.detail}`);
  }
  if (fails.length > 40) console.log(`  … and ${fails.length - 40} more`);
}
process.exit(fails.length ? 1 : 0);

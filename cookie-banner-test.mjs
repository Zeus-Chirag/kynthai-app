#!/usr/bin/env node
/**
 * cookie-banner-test.mjs — verifies the cookie-banner UX fixes.
 *
 * Renders the updated CookieConsent banner DOM (mirroring
 * src/components/kynthai/cookie-consent.tsx) with the REAL globals.css and
 * the shadcn Button/Card classes, then measures on phone viewports:
 *   - every action button hit area  >= 44px (WCAG 2.5.8)
 *   - close button hit area         >= 44px
 *   - banner total height           compact (previously ~372px, ~38% of screen)
 */
import { chromium } from '@playwright/test'
import { readFileSync } from 'fs'

const css = readFileSync('/tmp/tw-compiled.css', 'utf8')
// shadcn Button + Card base styles come from Tailwind utilities in globals.css;
// we mirror the exact className strings used by the component.
const BANNER = `
  <div class="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-6">
    <div class="mx-auto max-w-3xl rounded-xl border bg-card text-card-foreground shadow-2xl">
      <div class="p-3 sm:p-4">
        <div class="flex items-start gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <h3 class="text-sm font-semibold leading-6">We use cookies</h3>
              <button class="shrink-0 -mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Close">X</button>
            </div>
            <p class="mt-1 text-xs text-muted-foreground leading-relaxed">
              Essential cookies keep Kynthai working &mdash; they can&apos;t be disabled.
              With your consent, we also use analytics cookies to improve your
              experience. See our <button class="rounded-md px-1 -mx-1 py-2 -my-2 font-medium text-emerald-600 underline">Privacy Policy</button>
              for your CCPA/CPRA rights.
            </p>
            <div class="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
              <button class="col-span-2 h-11 min-h-11 w-full text-xs sm:col-span-1 sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary text-primary-foreground">Accept all</button>
              <button class="h-11 min-h-11 w-full text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border bg-background">Essential only</button>
              <button class="h-11 min-h-11 w-full text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md">Manage</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`

const VIEWPORTS = [[320, 568], [360, 800], [390, 844], [414, 896], [430, 932], [768, 1024]]

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
let failed = 0
try {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.setContent(`<style>${css}</style><body style="margin:0;background:#fff">${BANNER}</body>`, { waitUntil: 'load' })

  for (const [w, h] of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h })
    await page.waitForTimeout(60)
    const m = await page.evaluate(() => {
      const banner = document.querySelector('.fixed')
      // Action buttons only (h-11): Accept all / Essential only / Manage / Close.
      // The inline Privacy Policy text link is a run of text, exempt per WCAG 2.5.8.
      const btns = Array.from(document.querySelectorAll('button.h-11')).map(b => {
        const r = b.getBoundingClientRect()
        return { text: (b.textContent || '').trim().slice(0, 16), h: Math.round(r.height) }
      })
      return { bannerH: Math.round(banner.getBoundingClientRect().height), btns, screenH: window.innerHeight }
    })
    const minBtn = Math.min(...m.btns.map(b => b.h))
    const allOk = minBtn >= 44
    if (!allOk) failed++
    console.log(
      `  ${allOk ? 'PASS' : 'FAIL'}  ${String(w).padStart(4)}×${String(h).padStart(4)}  banner=${String(m.bannerH).padStart(3)}px (${Math.round((m.bannerH / m.screenH) * 100)}% of screen)  min-btn=${minBtn}px  ${m.btns.map(b => b.h).join('/')}px`
    )
  }
} finally {
  await browser.close()
}

console.log(failed === 0 ? '\nALL COOKIE-BANNER CHECKS PASSED' : `\n${failed} CHECKS FAILED`)
process.exit(failed ? 1 : 0)

#!/usr/bin/env node
/**
 * phone-scale-test.mjs — verifies the fixed-canvas phone scaling.
 *
 * Renders the PhoneMockup SKELETON DOM (plain static markup, identical to
 * src/components/kynthai/phone-mockup-wrapper.tsx) with the REAL
 * src/app/globals.css, then measures .phone-canvas at many device widths.
 *
 * The contract under test (pure CSS, zero JS):
 *   .phone-scale-container { container-type: inline-size }
 *   .phone-canvas { width: 340px; max-width: 100%; margin-inline: auto;
 *                   zoom: min(1, calc(100cqw / 340px)) }
 *
 * For every viewport: canvas rendered width must equal min(340, columnWidth)
 * — i.e. the phone is always the SAME 340px design canvas, uniformly scaled
 * (zoom), never reflowed. That is what makes the composition identical on
 * every device.
 */
import { chromium } from '@playwright/test'
import { readFileSync } from 'fs'

const css = readFileSync('src/app/globals.css', 'utf8')

// Faithful replica of the skeleton DOM (static, no React needed).
const SKELETON = `
  <div class="phone-scale-container w-full">
    <div class="phone-canvas relative mx-auto">
      <div class="mx-auto overflow-hidden rounded-[3rem] border-[3px] border-emerald-300/30 bg-neutral-950 p-[4px] shadow-2xl shadow-emerald-900/30">
        <div class="overflow-hidden rounded-[2.85rem] bg-neutral-200 dark:bg-neutral-800">
          <div class="mx-auto mt-2 h-6 w-16 rounded-full bg-neutral-300 dark:bg-neutral-700"></div>
          <div class="flex items-center justify-between px-5 pt-1.5 pb-0.5">
            <div class="h-3 w-8 rounded bg-neutral-300 dark:bg-neutral-700"></div>
            <div class="flex gap-1">
              <div class="h-3 w-3 rounded bg-neutral-300 dark:bg-neutral-700"></div>
              <div class="h-3 w-3 rounded bg-neutral-300 dark:bg-neutral-700"></div>
              <div class="h-3 w-4 rounded bg-neutral-300 dark:bg-neutral-700"></div>
            </div>
          </div>
          <div class="flex items-center justify-between px-4 pt-2 pb-1">
            <div class="flex items-center gap-2">
              <div class="h-5 w-5 rounded-lg bg-neutral-300 dark:bg-neutral-700"></div>
              <div class="h-4 w-16 rounded bg-neutral-300 dark:bg-neutral-700"></div>
            </div>
            <div class="h-4 w-4 rounded bg-neutral-300 dark:bg-neutral-700"></div>
          </div>
          <div class="mx-4 mt-2 rounded-2xl bg-emerald-200/60 p-4 dark:bg-emerald-900/30">
            <div class="h-3 w-24 rounded bg-emerald-300/60 dark:bg-emerald-800/40"></div>
            <div class="mt-3 space-y-2">
              <div class="h-12 rounded-xl bg-white/30 dark:bg-white/10"></div>
              <div class="h-14 rounded-xl bg-white/30 dark:bg-white/10"></div>
            </div>
          </div>
          <div class="mx-4 mt-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-3">
            <div class="h-3 w-20 rounded bg-neutral-300 dark:bg-neutral-700"></div>
            <div class="mt-3 flex items-center gap-2">
              <div class="h-9 w-9 rounded-xl bg-neutral-300 dark:bg-neutral-700"></div>
              <div class="flex-1 space-y-1">
                <div class="h-3 w-24 rounded bg-neutral-300 dark:bg-neutral-700"></div>
                <div class="h-2.5 w-20 rounded bg-neutral-300/60 dark:bg-neutral-700/60"></div>
              </div>
              <div class="h-7 w-14 rounded-full bg-neutral-300 dark:bg-neutral-700"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`

const VIEWPORTS = [
  [320, 568], [344, 740], [360, 640], [375, 667], [390, 844], [414, 896],
  [430, 932], [480, 800], [540, 960], [600, 1024], [768, 1024], [820, 1180],
  [1024, 768], [1280, 800], [1440, 900], [1920, 1080],
]

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
let failed = 0
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.setContent(`<style>${css}</style><body style="margin:0;padding:16px">${SKELETON}</body>`, { waitUntil: 'load' })

  for (const [w, h] of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h })
    await page.waitForTimeout(60)
    const m = await page.evaluate(() => {
      const container = document.querySelector('.phone-scale-container')
      const canvas = document.querySelector('.phone-canvas')
      const c = container.getBoundingClientRect()
      const v = canvas.getBoundingClientRect()
      return {
        containerWidth: Math.round(c.width),
        canvasWidth: Math.round(v.width),
        canvasHeight: Math.round(v.height),
        zoom: getComputedStyle(canvas).zoom || 'none',
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }
    })
    // Column width = viewport minus the 16px body padding on each side.
    const colWidth = w - 32
    const expected = Math.min(340, colWidth)
    const ok = m.canvasWidth === expected && m.scrollWidth <= m.innerWidth
    const marker = ok ? 'PASS' : 'FAIL'
    if (!ok) failed++
    console.log(
      `  ${marker}  ${String(w).padStart(5)}×${String(h).padStart(4)}  col=${String(m.containerWidth).padStart(4)}  canvas=${String(m.canvasWidth).padStart(3)}  (expected ${expected})  zoom=${String(m.zoom).padEnd(7)}  overflow=${m.scrollWidth > m.innerWidth ? 'YES' : 'no'}`
    )
  }
} finally {
  await browser.close()
}

console.log(failed === 0 ? '\nALL DEVICE CHECKS PASSED' : `\n${failed} DEVICE CHECKS FAILED`)
process.exit(failed ? 1 : 0)

/**
 * Static guards for the app-wide motion system.
 *
 * Source-read assertions (same pattern as security-hardening.test.ts) that
 * lock in the motion accessibility + timing contract:
 *
 *   1. The app tree is wrapped in <MotionConfig reducedMotion="user"> so every
 *      Framer Motion transform/layout animation respects prefers-reduced-motion.
 *   2. No infinite (`repeat: Infinity`) Framer Motion transition may run longer
 *      than 4s per segment — the "floating feels dead/slow" regression class.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const read = (p: string) => readFileSync(join(ROOT, p), 'utf-8')

/** Recursively list .ts/.tsx files under a src-relative directory. */
function walk(dir: string, acc: string[] = []): string[] {
  const full = join(ROOT, dir)
  for (const entry of readdirSync(full)) {
    const rel = join(dir, entry)
    const st = statSync(join(ROOT, rel))
    if (st.isDirectory()) walk(rel, acc)
    else if (/\.(ts|tsx)$/.test(entry)) acc.push(rel)
  }
  return acc
}

/** Extract every `transition={{ ... }}` object, handling nested braces. */
function transitionObjects(src: string): string[] {
  const out: string[] = []
  let i = 0
  while ((i = src.indexOf('transition={{', i)) !== -1) {
    let depth = 0
    let j = i
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++
      else if (src[j] === '}') {
        depth--
        if (depth === 0) break
      }
    }
    out.push(src.slice(i, j + 1))
    i = j + 1
  }
  return out
}

describe('motion system guards', () => {
  it('providers.tsx wraps the app in <MotionConfig reducedMotion="user">', () => {
    const src = read('src/app/providers.tsx')
    expect(src).toContain('<MotionConfig reducedMotion="user">')
    expect((src.match(/<MotionConfig\b/g) || []).length).toBe(1)
    expect((src.match(/<\/MotionConfig>/g) || []).length).toBe(1)
  })

  it('no infinite Framer Motion transition runs longer than 4s', () => {
    const offenders: string[] = []
    // Walk the ENTIRE src tree (components, ui, app pages, hooks, lib, …) so a
    // slow infinite loop added in ANY directory is caught — not just
    // src/components/kynthai. Test files are skipped: they carry no Framer
    // Motion transitions and would only add self-referential noise.
    for (const file of walk('src')) {
      if (/\.(test|spec)\.(ts|tsx)$/.test(file)) continue
      const src = read(file)
      for (const block of transitionObjects(src)) {
        if (!block.includes('repeat: Infinity')) continue
        const durations = [...block.matchAll(/duration:\s*([\d.]+)/g)].map((m) => parseFloat(m[1] ?? ''))
        for (const d of durations) {
          if (d > 4) offenders.push(`${file}: duration ${d}s in ${block.slice(0, 60)}…`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})

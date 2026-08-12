import { describe, it, expect } from 'vitest'
import { parseTimes } from '@/lib/parse-times'

describe('parseTimes', () => {
  it('parses JSON array strings (current format)', () => {
    expect(parseTimes('["08:00","20:00"]')).toEqual(['08:00', '20:00'])
  })

  it('parses legacy comma-separated strings (seed bug — the 500)', () => {
    expect(parseTimes('08:00,12:00,18:00')).toEqual(['08:00', '12:00', '18:00'])
    expect(parseTimes('08:00,20:00')).toEqual(['08:00', '20:00'])
  })

  it('passes through already-parsed arrays', () => {
    expect(parseTimes(['08:00'])).toEqual(['08:00'])
  })

  it('drops invalid times and falls back to 09:00', () => {
    expect(parseTimes('not-a-time')).toEqual(['09:00'])
    expect(parseTimes('')).toEqual(['09:00'])
    expect(parseTimes(null)).toEqual(['09:00'])
    expect(parseTimes(['25:00', '08:00'])).toEqual(['08:00'])
    expect(parseTimes('["08:00","oops"]')).toEqual(['08:00'])
  })
})

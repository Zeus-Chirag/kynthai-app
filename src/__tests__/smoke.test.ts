import { describe, it, expect } from 'vitest'

describe('Kynthai app smoke tests', () => {
  it('truthy sanity check', () => {
    expect(true).toBe(true)
  })

  it('build artifact exists after successful build', async () => {
    const fs = await import('fs')
    expect(fs.existsSync('.next')).toBe(true)
  })
})

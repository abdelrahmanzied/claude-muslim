import { describe, expect, test } from 'claude-code/testing'

import { FRESH_MS, isDue, MINARET, minaretRows, TOTAL_MS } from '../../src/features/salah/minaret.ts'

describe('minaret', () => {
  test('rises from the base: frame n shows the n bottom rows, the height stays', { options: { athkar: false } }, async () => {
    expect(minaretRows(1)).toEqual([...MINARET.slice(0, 6).map(row => ' '.repeat(row.length)), ' ▐███▌ '])
    expect(minaretRows(7)).toEqual([...MINARET])
    expect(minaretRows(3).filter(row => row.trim() !== '')).toEqual(MINARET.slice(4))
    expect(new Set(minaretRows(4).map(row => row.length))).toEqual(new Set([7]))
  })

  test('the moment is about three seconds', { options: { athkar: false } }, async () => {
    expect(TOTAL_MS).toBeGreaterThanOrEqual(2800)
    expect(TOTAL_MS).toBeLessThanOrEqual(3200)
  })

  test('plays once for a pray that has just come in', { options: { athkar: false } }, async () => {
    expect(isDue(1000, 1000, null)).toBe(true)
    expect(isDue(1000, 1000 + FRESH_MS, null)).toBe(true)
    expect(isDue(1000, 1000 + FRESH_MS + 1, null)).toBe(false)
    expect(isDue(1000, 999, null)).toBe(false)
    expect(isDue(1000, 1500, 1000)).toBe(false)
    expect(isDue(1000, 1500, 400)).toBe(true)
  })
})

import { describe, expect, test } from 'claude-code/testing'

import { FRESH_MS, isDue, MINARET, minaretRows, minaretStage, TOTAL_MS } from '../../src/features/salah/minaret.ts'
import { ATHKAR_QUIET } from '../fixtures/config.ts'

describe('minaret', () => {
  test('rises from the base: frame n shows the n bottom rows, the height stays', { options: { ...ATHKAR_QUIET } }, async () => {
    expect(minaretRows(1)).toEqual([...MINARET.slice(0, 6).map(row => ' '.repeat(row.length)), ' ▐███▌ '])
    expect(minaretRows(7)).toEqual([...MINARET])
    expect(minaretRows(3).filter(row => row.trim() !== '')).toEqual(MINARET.slice(4))
    expect(new Set(minaretRows(4).map(row => row.length))).toEqual(new Set([7]))
  })

  test('the moment is about three seconds', { options: { ...ATHKAR_QUIET } }, async () => {
    expect(TOTAL_MS).toBeGreaterThanOrEqual(2800)
    expect(TOTAL_MS).toBeLessThanOrEqual(3200)
  })

  test('plays once for a pray that has just come in', { options: { ...ATHKAR_QUIET } }, async () => {
    expect(isDue(1000, 1000, null)).toBe(true)
    expect(isDue(1000, 1000 + FRESH_MS, null)).toBe(true)
    expect(isDue(1000, 1000 + FRESH_MS + 1, null)).toBe(false)
    expect(isDue(1000, 999, null)).toBe(false)
    expect(isDue(1000, 1500, 1000)).toBe(false)
    expect(isDue(1000, 1500, 400)).toBe(true)
  })
})

test('reload restores rise, fold and expiry from absolute deadlines', () => {
  const moment = { startedAt: 1000, foldsAt: 1000 + TOTAL_MS, until: 901000, isFolded: false }
  expect(minaretStage(moment, 1000 + 330)).toEqual({ frame: 2, isFolded: false, isGone: false })
  expect(minaretStage(moment, moment.foldsAt)).toEqual({ frame: 7, isFolded: true, isGone: false })
  expect(minaretStage(moment, moment.until).isGone).toBe(true)
})

test('the moment is due for exactly as long as the footer keeps the call', () => {
  expect(FRESH_MS).toBe(15 * 60_000)
  expect(isDue(1000, 1000 + 3 * 60_000, null)).toBe(true)
  expect(isDue(1000, 1000 + 3 * 60_000, 1000)).toBe(false)
})

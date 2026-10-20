import { expect, test } from 'claude-code/testing'
import { DURATION_LIMIT, readDurations, trimDurations } from '../../src/features/quran/durations.ts'
test('duration cache evicts oldest entries, refreshes recency and rejects unreadable numbers', () => {
  const initial = Object.fromEntries(Array.from({ length: DURATION_LIMIT }, (_, i) => [`reader:${i}`, i + 1]))
  const refreshed = trimDurations(initial, 'reader:0', 500)
  const next = trimDurations(refreshed, 'new:18', 600)
  expect(Object.keys(next)).toHaveLength(DURATION_LIMIT)
  expect(next['reader:0']).toBe(500)
  expect(next['reader:1']).toBeUndefined()
  expect(readDurations({ bad: '12', nan: NaN, negative: -1, good: 12 })).toEqual({ good: 12 })
})

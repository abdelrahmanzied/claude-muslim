import { expect, test } from 'claude-code/testing'
import { isAvailable, nearestAvailable, nextAvailable, unavailableNote, unavailableSurahs } from '../../src/features/quran/availability.ts'
import { nextPlaybackItem } from '../../src/features/quran/player.ts'

test('unavailable note uses the agreed Arabic agreement and Arabic-Indic digits', () => {
  expect(unavailableNote(0)).toBe('')
  expect(unavailableNote(1)).toBe('سورة واحدة غير متاحة لهذا القارئ')
  expect(unavailableNote(2)).toBe('سورتان غير متاحتين لهذا القارئ')
  for (const count of [3, 5, 10]) expect(unavailableNote(count)).toBe(`${String(count).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]!)} سور غير متاحة لهذا القارئ`)
  expect(unavailableNote(11)).toBe('١١ سورة غير متاحة لهذا القارئ')
  expect(unavailableNote(51)).toBe('٥١ سورة غير متاحة لهذا القارئ')
  expect(unavailableNote(114)).toBe('١١٤ سورة غير متاحة لهذا القارئ')
})
test('real no-timing recording skips consecutive unavailable runs in both directions', () => {
  expect(unavailableSurahs('102:102')).toEqual([2, 3, 4, 5, 7])
  expect(isAvailable('102:102', 2)).toBe(false)
  expect(isAvailable('102:102', 6)).toBe(true)
  expect(nearestAvailable('102:102', 2)).toBe(6)
  expect(nextAvailable('102:102', 1, 1)).toBe(6)
  expect(nextAvailable('102:102', 6, -1)).toBe(1)
  expect(nextAvailable('102:102', 6, 1)).toBe(8)
  expect(nearestAvailable('87:87', 27)).toBe(28)
  expect(nearestAvailable('178:232', 14)).toBe(15)
  expect(unavailableSurahs('108:108').length).toBeGreaterThan(20)
})
test('navigation preserves available edges, never wraps and handles a fully unavailable catalog', () => {
  expect(nearestAvailable('102:102', 1)).toBe(1)
  expect(nearestAvailable('102:102', 114)).toBe(114)
  expect(nextAvailable('102:102', 1, -1)).toBe(null)
  expect(nextAvailable('102:102', 114, 1)).toBe(null)
  const blocked = Object.fromEntries(Array.from({ length: 114 }, (_, i) => [i + 1, 'no-timing' as const]))
  const all = Object.freeze({ blocked: { unavailable: Object.freeze(blocked) } })
  for (const surah of [1, 50, 114]) {
    expect(nearestAvailable('blocked', surah, all)).toBe(null)
    expect(nextAvailable('blocked', surah, 1, all)).toBe(null)
    expect(nextAvailable('blocked', surah, -1, all)).toBe(null)
  }
  const edges = { edges: { unavailable: { 1: 'no-timing' as const, 114: 'no-timing' as const } } }
  expect(nearestAvailable('edges', 1, edges)).toBe(2)
  expect(nearestAvailable('edges', 114, edges)).toBe(113)
})
test('a recording absent from support retains all 114 surahs and ordinary navigation', () => {
  expect(unavailableSurahs('new:recording')).toEqual([])
  for (let surah = 1; surah <= 114; surah++) {
    expect(isAvailable('new:recording', surah)).toBe(true)
    expect(nearestAvailable('new:recording', surah)).toBe(surah)
  }
  expect(nextAvailable('new:recording', 1, 1)).toBe(2)
  expect(nextAvailable('new:recording', 114, -1)).toBe(113)
  expect(isAvailable('new:recording', 0)).toBe(false)
  expect(isAvailable('new:recording', 115)).toBe(false)
})
test('natural whole and final-quarter ends skip gaps, retaining repeat and generation guards', () => {
  expect(nextPlaybackItem(1, null, 0, 'off', true, 4, 4, '102:102')).toEqual({ surah: 6, index: 0 })
  expect(nextPlaybackItem(1, 2, 3, 'off', true, 4, 4, '102:102')).toEqual({ surah: 6, index: 0 })
  expect(nextPlaybackItem(1, 1, 3, 'off', true, 4, 4, '102:102')).toEqual({ surah: 1, index: 2 })
  expect(nextPlaybackItem(1, null, 0, 'surah', true, 4, 4, '102:102')).toEqual({ surah: 1, index: 0 })
  expect(nextPlaybackItem(1, null, 0, 'off', true, 4, 5, '102:102')).toBe(null)
  expect(nextPlaybackItem(1, null, 0, 'off', false, 4, 4, '102:102')).toBe(null)
  expect(nextPlaybackItem(114, null, 0, 'off', true, 4, 4, '102:102')).toBe(null)
})

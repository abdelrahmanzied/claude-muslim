import { expect, test } from 'claude-code/testing'
import { arabicDigits, segmentLabel, segmentPiece } from '../../src/features/quran/label.ts'

const seg = (quarter: number, firstAyah: number, lastAyah: number) => ({ quarter, firstAyah, lastAyah })

test('a segment is named by its quarter and ayahs, with Arabic digits and the Arabic comma', () => {
  expect(arabicDigits(2024)).toBe('٢٠٢٤')
  expect(segmentLabel([seg(5, 15, 24)], 0)).toBe('الربع ٥، الآيات ١٥–٢٤')
  expect(segmentLabel([seg(1, 1, 7)], 0)).toBe('الربع ١، الآيات ١–٧')
})

test('a quarter cut into several consecutive segments counts its pieces', () => {
  const list = [seg(4, 1, 9), seg(5, 10, 14), seg(5, 15, 24), seg(6, 25, 30)]
  expect(segmentLabel(list, 1)).toBe('الربع ٥، الآيات ١٠–١٤ (١ من ٢)')
  expect(segmentLabel(list, 2)).toBe('الربع ٥، الآيات ١٥–٢٤ (٢ من ٢)')
  expect(segmentLabel(list, 0)).not.toContain('من')
  expect(segmentPiece(list, 2)).toEqual({ k: 2, n: 2 })
  expect(segmentPiece(list, 3)).toBeNull()
})

test('the label never uses «·» and a missing segment is empty', () => {
  expect(segmentLabel([seg(10, 100, 120)], 0)).not.toContain('·')
  expect(segmentLabel([], 0)).toBe('')
  expect(segmentPiece([], 3)).toBeNull()
})

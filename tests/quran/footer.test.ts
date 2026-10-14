import { expect, test } from 'claude-code/testing'
import { CHIP_FULL_COLUMNS, CHIP_TIME_COLUMNS, chipSize, chipText } from '../../src/features/quran/footer.ts'

test('the chip is full when wide or unmeasured, and sheds words as the column narrows', () => {
  expect(chipSize(undefined, false)).toBe('full')
  expect(chipSize(Number.NaN, false)).toBe('full')
  expect(chipSize(200, false)).toBe('full')
  expect(chipSize(CHIP_FULL_COLUMNS, false)).toBe('full')
  expect(chipSize(CHIP_FULL_COLUMNS - 1, false)).toBe('time')
  expect(chipSize(CHIP_TIME_COLUMNS, false)).toBe('time')
  expect(chipSize(CHIP_TIME_COLUMNS - 1, false)).toBe('glyph')
  expect(chipSize(0, false)).toBe('glyph')
})

test('a docked pane reduces the chip to its glyph at any width', () => {
  expect(chipSize(200, true)).toBe('glyph')
  expect(chipSize(undefined, true)).toBe('glyph')
})

test('chip text keeps the authored words, only dropping some', () => {
  expect(chipText('full', 'القرآن', null)).toBe('۞ القرآن')
  expect(chipText('full', 'الكهف', '00:01')).toBe('۞ الكهف 00:01')
  expect(chipText('time', 'الكهف', '00:01')).toBe('۞ 00:01')
  expect(chipText('time', 'القرآن', null)).toBe('۞ القرآن')
  expect(chipText('glyph', 'الكهف', '00:01')).toBe('۞')
})

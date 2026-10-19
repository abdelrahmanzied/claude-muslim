import { expect, test } from 'claude-code/testing'
import { arabicDigits, latinDigits } from '../../../src/shared/digits/index.ts'
test('digit conversion round trips mixed labels and preserves authored words', () => {
  expect(arabicDigits('الربع 15 - 24:00')).toBe('الربع ١٥ - ٢٤:٠٠')
  expect(latinDigits('الربع ١٥ - ٢٤:٠٠')).toBe('الربع 15 - 24:00')
  expect(latinDigits(arabicDigits(1029384756))).toBe('1029384756')
})

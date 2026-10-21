import { expect, test } from 'claude-code/testing'
import { arabicDigits, latinDigits, typedInteger } from '../../../src/shared/digits/index.ts'
test('digit conversion round trips mixed labels and preserves authored words', () => {
  expect(arabicDigits('الربع 15 - 24:00')).toBe('الربع ١٥ - ٢٤:٠٠')
  expect(latinDigits('الربع ١٥ - ٢٤:٠٠')).toBe('الربع 15 - 24:00')
  expect(latinDigits(arabicDigits(1029384756))).toBe('1029384756')
})

test('a typed whole number takes Latin, Arabic-Indic and Persian digits; a sign only where negatives are allowed', () => {
  expect(typedInteger('25', 1, 60)).toBe(25)
  expect(typedInteger(' ٢٥ ', 1, 60)).toBe(25)
  expect(typedInteger('۲۵', 1, 60)).toBe(25)
  expect(typedInteger('0', 1, 60)).toBeUndefined()
  expect(typedInteger('61', 1, 60)).toBeUndefined()
  expect(typedInteger('-3', 1, 60)).toBeUndefined()
  expect(typedInteger('+3', 1, 60)).toBeUndefined()
  for (const text of ['', ' ', '3.5', '3,5', '1e2', 'abc', '٣a', '- 3', '--3', '0x10']) expect(typedInteger(text, -Infinity, Infinity)).toBeUndefined()
  expect(typedInteger('-3', -Infinity, Infinity)).toBe(-3)
  expect(typedInteger('−٣', -Infinity, Infinity)).toBe(-3)
  expect(typedInteger('+5', -Infinity, Infinity)).toBe(5)
  expect(typedInteger('0', -Infinity, Infinity)).toBe(0)
  expect(typedInteger('99999999999999999999', -Infinity, Infinity)).toBeUndefined()
})

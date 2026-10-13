import { expect, test } from 'claude-code/testing'
import { readOptions } from '../../../src/config.ts'
import { accentHex, accentText } from '../../../src/shared/color/index.ts'

test('the shared color reads each choice and defaults to orange', () => {
  expect(readOptions({}).color).toBe('orange')
  for (const color of ['orange', 'green', 'gold', 'blue']) expect(readOptions({ color }).color).toBe(color)
  expect(readOptions({ color: 'invalid' }).color).toBe('orange')
})
test('orange text stays the theme key; drawn and non-orange colors use the shared shades', () => {
  for (const theme of ['light', 'dark', 'light-ansi', 'dark-ansi', 'custom', undefined]) {
    expect(accentText('orange', theme)).toBe('claude')
  }
  expect(accentText('blue', 'light')).toBe('#3a6aa3')
  expect(accentText('blue', 'dark')).toBe('#4a7fc0')
  expect(accentHex('orange', true)).toBe('#d97757')
  expect(accentHex('orange', false)).toBe('#c8642d')
})

import { expect, test } from 'claude-code/testing'
import { configRows } from '../../fixtures/config.ts'
import { configFailure, hasConfigRow, MISSING_CONFIG } from '../../../src/shared/reload/config.ts'

test('settings preflight matches the exact ConfigRow key', () => {
  expect(hasConfigRow(configRows, 'muslim.color')).toBe(true)
  expect(hasConfigRow([], 'muslim.color')).toBe(false)
  expect(hasConfigRow([{ ...configRows[0]!, key: 'color', label: 'muslim.color' }], 'muslim.color')).toBe(false)
})

test('missing config rows give a readable recovery message, while other failures retain their reason', () => {
  const raw = 'muslim: $.config.set: no /config row with key muslim.color ($.config.list names them)'
  expect(configFailure(new Error(raw))).toBe(MISSING_CONFIG)
  expect(configFailure(raw.toUpperCase())).toBe(MISSING_CONFIG)
  expect(configFailure(new Error('locked'))).toBe('Not changed: locked')
})

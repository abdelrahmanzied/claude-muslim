import { expect, test } from 'claude-code/testing'
import { fontFamilyFor, TAJAWAL_FAMILY } from '../../../src/shared/font/index.ts'

test('the font family follows the language of the text', () => {
  for (const lang of ['ar', 'ar-EG', 'FA', 'ur']) expect(fontFamilyFor(lang)).toBe(TAJAWAL_FAMILY)
  for (const lang of ['en', 'vi', 'tr', 'id', undefined]) expect(fontFamilyFor(lang)).toBe('system-ui,sans-serif')
})

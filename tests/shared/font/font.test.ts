import { expect, test } from 'claude-code/testing'
import { TAJAWAL_FAMILY, tajawalFontFaceCss } from '../../../src/shared/font/index.ts'

test('the shared font css embeds Tajawal 400 and 700 as WOFF2 data', () => {
  const css = tajawalFontFaceCss()
  expect(css.match(/@font-face/g)).toHaveLength(2)
  for (const expected of ['font-family:Tajawal', 'font-weight:400', 'font-weight:700', 'data:font/woff2;base64,d09GM']) expect(css).toContain(expected)
  expect(TAJAWAL_FAMILY).toBe('Tajawal,sans-serif')
})

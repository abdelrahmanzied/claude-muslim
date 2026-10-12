import { expect, test } from 'claude-code/testing'
import { CARD, controlSvg, ltrTime, progressSvg, titleSvg } from '../../src/features/quran/card.ts'

test('desktop progress uses the mockup greens, rounded rectangles, and fills from the right', () => {
  const progress = progressSvg(250, 1000)
  expect(progress).toContain(`fill="${CARD.border}"`)
  expect(progress).toContain('x="240" width="80"')
  expect(progress).toContain(`rx="3" fill="${CARD.accent}"`)
  expect(progressSvg(10000, null)).toContain('x="320" width="0"')
  expect(progressSvg(2000, 1000)).toContain('x="0" width="320"')
  expect(progressSvg(-1, 1000)).toContain('x="320" width="0"')
})
test('large bold Arabic title is XML escaped, controls have circular artwork with a larger filled middle', () => {
  expect(titleSvg('سورة الكهف')).toContain('font-size="26" font-weight="600"')
  expect(titleSvg('سورة الكهف')).toContain('سورة الكهف')
  expect(titleSvg('<&"')).toContain('&lt;&amp;&quot;')
  expect(controlSvg('stop')).toContain('width="56" height="56"')
  expect(controlSvg('prev')).toContain('width="46" height="46"')
  expect(controlSvg('play')).toContain(`fill="${CARD.ink}"`)
  expect(controlSvg('stop')).toContain('<rect x="5"')
  expect(controlSvg('next')).toContain('M19 5l-9 7 9 7z M5 5v14')
  expect(ltrTime('1:00:00')).toBe('\u20661:00:00\u2069')
})

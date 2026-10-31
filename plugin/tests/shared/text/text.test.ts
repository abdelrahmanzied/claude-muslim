import { expect, test } from 'claude-code/testing'
import { CLASS, directionOf, drawText, escapeText, MIN_TEXT_LINE, textClass, textCss, TEXT_LINE, tightMargin } from '../../../src/shared/text/index.ts'

test('the line-height is roomy enough for stacked marks and never changes below the floor', () => {
  expect(TEXT_LINE).toBeGreaterThanOrEqual(MIN_TEXT_LINE)
  expect(MIN_TEXT_LINE).toBeGreaterThanOrEqual(1.8)
  expect(textCss()).toContain(`.tx{line-height:${TEXT_LINE};`)
})

test('the classes: one clipped line with an ellipsis, or wrapped text that is never clipped', () => {
  expect(textClass()).toBe('tx tx-line')
  expect(textClass('line')).toBe('tx tx-line')
  expect(textClass('wrap')).toBe('tx tx-wrap')
  const css = textCss()
  expect(css).toContain('.tx-line{display:block;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}')
  expect(css.slice(css.indexOf('.tx-wrap'))).not.toContain('overflow:hidden')
  expect(CLASS.line).toBe('tx-line')
})

test('the direction follows the language, else the first letter, in any script', () => {
  for (const lang of ['ar', 'fa', 'ur', 'he', 'ar-EG', 'UR']) expect(directionOf('x', lang)).toBe('rtl')
  for (const lang of ['en', 'tr', 'vi', 'id', 'fr', 'hi']) expect(directionOf('ب', lang)).toBe('ltr')
  expect(directionOf('قُلْ أَعُوذُ')).toBe('rtl')
  expect(directionOf('پاکِستان')).toBe('rtl')
  expect(directionOf('Tiếng Việt')).toBe('ltr')
  expect(directionOf('Ğüşöç')).toBe('ltr')
  // Digits and punctuation do not decide; the first letter does.
  expect(directionOf('1) قُلْ')).toBe('rtl')
  expect(directionOf('١٢:٠٠')).toBe('rtl')
  expect(directionOf('12:00 ب')).toBe('rtl')
  expect(directionOf('')).toBe('ltr')
})

test('drawText escapes the text and carries its direction, language and the feature class', () => {
  expect(drawText('قُلْ <b>&"')).toBe('<span class="tx tx-line" dir="rtl">قُلْ &lt;b&gt;&amp;&quot;</span>')
  expect(drawText('Ğüşöç', { lang: 'tr', className: 'pk-text', kind: 'wrap', tag: 'div' })).toBe('<div class="pk-text tx tx-wrap" dir="ltr" lang="tr">Ğüşöç</div>')
  expect(drawText('x', { lang: 'ur' })).toContain('dir="rtl" lang="ur"')
  expect(drawText('x', { style: 'font-size:13px' })).toContain(' style="font-size:13px"')
  expect(escapeText('a&b')).toBe('a&amp;b')
})

test('drawText with raw markup keeps it and sets a direction only when told', () => {
  expect(drawText('<bdi dir="ltr">v1</bdi>', { raw: true })).toBe('<span class="tx tx-line"><bdi dir="ltr">v1</bdi></span>')
  expect(drawText('<bdi dir="ltr">v1</bdi>', { raw: true, dir: 'ltr' })).toContain(' dir="ltr"')
})

test('a feature keeps its old row height with the margin the helper names', () => {
  expect(tightMargin(1)).toBe('-0.5em')
  expect(tightMargin(1.6)).toBe('-0.2em')
  expect(tightMargin(1.5)).toBe('-0.25em')
  expect(tightMargin(1.35)).toBe('-0.325em')
  expect(tightMargin(2)).toBe('0em')
})

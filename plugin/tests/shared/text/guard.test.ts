// The guard for DESIGN.md §4 "drawn text": text is never clipped by a feature's own CSS.
// Builds the real CSS of every desktop drawing and checks that all clipping of text lives in
// the shared text classes (src/shared/text), whose line-height leaves room for stacked marks.
import { expect, test } from 'claude-code/testing'
import { MIN_TEXT_LINE, textCss } from '../../../src/shared/text/index.ts'
import { athan, athanProps, band, bandModel, feeds, pane, settings } from '../../fixtures/drawings.ts'
import { clips, inlineStyles, lineHeightRatio, rulesOf, styleOf } from '../../fixtures/css.ts'
import { athanSvg } from '../../../src/features/salah/card.ts'
import { bandHtml } from '../../../src/features/athkar/band.ts'

// Boxes that clip but hold no text of their own, or whose text is already inside a shared text class.
// A new entry needs a reason; an entry that no drawing uses any more fails the test, so the list stays true.
const ALLOWED: Record<string, string> = {
  '.dp': 'the pane picture\'s own frame (its edge, not a text box)',
  '.sheet': 'the Quran list sheet: a frame around rows and a search box',
  '.rows': 'the list viewport: a frame around row boxes; each row\'s text clips itself with the shared class',
  '.pbar': 'the thin progress bar: no text',
  '.fx': 'the sky\'s decoration layer behind the card: no text',
  '.endfx': 'the finale\'s falling stars: decoration, no text',
  '.band.band.line:has(.cv-inline)': 'the cover\'s frame, which the shrinking cover must not spill out of; its title is a shared text line',
}

const markers = ['tx-line', 'tx-wrap']

const drawings = (): Record<string, string> => {
  const photo = 'QUJD'
  const quranError = { ...feeds.quran, error: 'تعذر التشغيل', audioNote: 'الصوت غير مدعوم على Windows بعد' }

  return {
    'athkar reading, open': band({}),
    'athkar reading, folded': band({ isActive: false }),
    'athkar cover, open': band({ phase: 'cover', hasBegun: false }),
    'athkar cover, folded': band({ phase: 'cover', isActive: false }),
    'athkar done, open': band({ phase: 'done', finaleMs: undefined }),
    'athkar done, folded': band({ phase: 'done', isActive: false }),
    'athkar finale': band({ phase: 'done', finaleMs: 1200 }),
    'athkar question, open': band({ phase: 'question', question: { title: 'أتممتَ الأذكار؟', remaining: '٣ دون عدّ كامل', confirm: 'نعم', resume: 'أكمل', focus: 'finish' } }),
    'athkar question, folded': band({ phase: 'question', isActive: false, question: { title: 'أتممتَ الأذكار؟', remaining: '٣ دون عدّ كامل', confirm: 'نعم', resume: 'أكمل', focus: 'finish' } }),
    'athan card, open': athan(photo, false),
    'athan card, folded': athan(photo, true),
    'athan card, with the start control': athanSvg({ ...athanProps(photo, false), canStart: true }, { hoverClose: false, hoverAction: true, columns: 0 }),
    'pane': pane(420, 'dark'),
    'pane, narrow': pane(240, 'light'),
    'pane, quran error and note': pane(420, 'dark', undefined, false, quranError),
    'pane, quran list': pane(420, 'dark', undefined, true),
    ...Object.fromEntries((['general', 'prayer', 'athkar', 'thikr'] as const).map(c => [`pane settings, ${c}`, pane(420, 'dark', settings(c))])),
    'pane settings, prayer methods': pane(420, 'dark', settings('prayer', 'methods')),
    'pane settings, prayer adjust': pane(420, 'dark', settings('prayer', 'adjust')),
    'pane settings, prayer city': pane(420, 'dark', settings('prayer', 'city')),
  }
}

test('the shared text classes keep a line-height that leaves room for stacked marks', () => {
  expect(MIN_TEXT_LINE).toBeGreaterThanOrEqual(1.8)
  const rules = rulesOf(textCss())
  const text = rules.find(r => r.selector === '.tx')
  expect(text).toBeDefined()
  expect(lineHeightRatio(text!.decls)).toBeGreaterThanOrEqual(MIN_TEXT_LINE)
  const line = rules.find(r => r.selector === '.tx-line')
  expect(line?.decls['text-overflow']).toBe('ellipsis')
  expect(line?.decls['overflow']).toBe('hidden')
  // No other rule of the classes lowers the line-height.
  for (const r of rules) if (r.decls['line-height'] !== undefined) expect(lineHeightRatio(r.decls)).toBeGreaterThanOrEqual(MIN_TEXT_LINE)
})

test('no drawing clips text outside the shared text classes', () => {
  const seen = new Set<string>()
  const offenders: string[] = []
  for (const [name, svg] of Object.entries(drawings())) {
    const css = styleOf(svg)
    expect(css.length).toBeGreaterThan(0)
    for (const r of rulesOf(css)) {
      if (r.selector.startsWith('.tx-') || r.selector === '.tx') continue
      if (clips(r.decls).length === 0) continue
      if (r.selector in ALLOWED) seen.add(r.selector)
      else offenders.push(`${name}: ${r.selector} { ${clips(r.decls).join('; ')} }`)
    }
    for (const style of inlineStyles(svg)) {
      const d = Object.fromEntries(style.split(';').map(p => [p.slice(0, p.indexOf(':')).trim().toLowerCase(), p.slice(p.indexOf(':') + 1).trim()]))
      if (clips(d).length) offenders.push(`${name}: inline style="${style}"`)
    }
  }
  expect(offenders).toEqual([])
  expect(Object.keys(ALLOWED).filter(s => !seen.has(s))).toEqual([])
})

test('every drawing that clips a text line carries the shared rules, and its text elements carry both classes', () => {
  let lines = 0
  for (const [name, svg] of Object.entries(drawings())) {
    const used = [...svg.matchAll(/class="([^"]*)"/g)].map(m => (m[1] ?? '').split(/\s+/)).filter(c => markers.some(m => c.includes(m)))
    for (const classes of used) expect(`${name}: ${classes.join(' ')}`).toContain('tx ')
    if (used.length) {
      lines += used.length
      const rules = rulesOf(styleOf(svg))
      expect(rules.find(r => r.selector === '.tx')).toBeDefined()
      expect(rules.find(r => r.selector === '.tx-line')?.decls['text-overflow']).toBe('ellipsis')
    }
  }
  expect(lines).toBeGreaterThan(40)
})

test('the band built as plain html (no style block) never clips either', () => {
  const html = bandHtml(bandModel({ isActive: false }))
  for (const style of inlineStyles(html)) expect(clips(Object.fromEntries(style.split(';').map(p => [p.slice(0, p.indexOf(':')).trim(), p.slice(p.indexOf(':') + 1).trim()])))).toEqual([])
})

import { expect, test } from 'claude-code/testing'

import { ATHKAR } from '../../src/features/athkar/data.ts'
import { arabicDigits, dayOf, END, isAct, emptyReading, listFor, overall, periodAt, readDay, shouldAdvance, skyAt, step, textOf } from '../../src/features/athkar/logic.ts'
import type { Reading } from '../../src/features/athkar/logic.ts'
import { bandHeight, bandSvg, closeArea, coverFit, doneFit, finaleSize, fitOf, pixelOf } from '../../src/features/athkar/band.ts'
import type { BandModel } from '../../src/features/athkar/band.ts'
import { SIZE_DEFAULT, readSize } from '../../src/config.ts'
import { hitsFor } from '../../src/features/athkar/install.tsx'

test('morning runs 05:00 to 17:00, evening the rest', async () => {
  expect([4, 5, 12, 16, 17, 23, 0].map(periodAt)).toEqual(['evening', 'morning', 'morning', 'morning', 'evening', 'evening', 'evening'])
})

test('the sky follows the clock', async () => {
  expect([4.5, 6.5, 12, 17.5, 18.5, 20, 2].map(skyAt)).toEqual(['dawn', 'sunrise', 'day', 'rose', 'bluehour', 'crescent', 'crescent'])
})

test('after midnight the evening still belongs to the day before', async () => {
  expect(dayOf(new Date(2026, 9, 11, 2, 0))).toBe('2026-10-10')
  expect(dayOf(new Date(2026, 9, 11, 5, 0))).toBe('2026-10-11')
})

test('a stored day from another day starts fresh', async () => {
  const stored = { day: '2026-10-09', morning: { ...emptyReading(), index: 4 }, evening: emptyReading() }
  expect(readDay(stored, '2026-10-10').morning.index).toBe(0)
  expect(readDay(stored, '2026-10-09').morning.index).toBe(4)
  expect(readDay('junk', '2026-10-10').day).toBe('2026-10-10')
})

test('93 is merged into 92; each period has its own thikrs and wording', async () => {
  expect(ATHKAR.some(t => t.id === '93')).toBe(false)
  const morning = listFor('morning').map(t => t.id)
  const evening = listFor('evening').map(t => t.id)
  expect(morning).toContain('94')
  expect(morning).not.toContain('97')
  expect(evening).toContain('97')
  expect(evening).not.toContain('94')
  const t77 = ATHKAR.find(t => t.id === '77')!
  expect(textOf(t77, 'evening').startsWith('أَمْسَيْنَا')).toBe(true)
  // Counts come only from the data: 91 and 92 a hundred, 98 ten.
  expect(ATHKAR.some(t => 'choices' in t)).toBe(false)
  expect(['91', '92', '98'].map(id => ATHKAR.find(t => t.id === id)!.times)).toEqual([100, 100, 10])
})

test('counting fills the thikr, moves on past its end, and back undoes', async () => {
  let r: Reading = emptyReading()
  r = step('morning', r, { act: 'count' })
  expect(r.counts['75']).toBe(1)
  // 75 is said once: another count moves on.
  const done = r
  r = step('morning', r, { act: 'count' })
  expect(r.index).toBe(1)
  expect(shouldAdvance('morning', emptyReading(), done)).toBe(true)
  // Back at 0 goes to the thikr before; back with a count undoes one.
  r = step('morning', r, { act: 'back' })
  expect(r.index).toBe(0)
  r = step('morning', r, { act: 'back' })
  expect(r.counts['75']).toBe(0)
})

test('progress gives each thikr an equal share, partial counts included', async () => {
  const n = listFor('morning').length
  const r: Reading = { ...emptyReading(), counts: { '75': 1, '91': 50 } }
  expect(Math.abs(overall('morning', r) - 1.5 / n)).toBeLessThan(1e-9)
})

test('the last thikr counted to its end finishes the period', async () => {
  const list = listFor('evening')
  const last = list[list.length - 1]!
  let r: Reading = { ...emptyReading(), index: list.length - 1, counts: { [last.id]: last.times - 1 } }
  r = step('evening', r, { act: 'count' })
  expect(r.isDone).toBe(false)
  r = step('evening', r, { act: 'next' })
  expect(r.isDone).toBe(true)
})

test('there is no 10 | 100 choice: no such act, and an old saved reading with choices still loads', async () => {
  expect(isAct({ act: 'choose', times: 10 })).toBe(false)
  expect(isAct({ act: 'count' })).toBe(true)
  const old = { day: '2026-10-10', morning: { index: 2, counts: { '91': 40 }, choices: { '91': 10 }, isDone: false, isHidden: false }, evening: emptyReading() }
  const r = readDay(old, '2026-10-10').morning
  expect(r.index).toBe(2)
  expect(r.counts['91']).toBe(40)
  expect('choices' in r).toBe(false)
  // 91 is a hundred whatever an old reading picked.
  expect(Math.abs(overall('morning', r) * listFor('morning').length - 0.4)).toBeLessThan(1e-9)
})

const model = (over: Partial<BandModel>): BandModel => ({
  phase: 'reading', period: 'morning', sky: 'crescent', style: 'sky', accent: 'orange', isDark: true, isActive: true, hasBegun: true,
  title: 't', thikrId: '91', text: 'x', position: '١ مِنْ ٢٢', count: 3, times: 100, progress: 30, from: 20,
  end: 'e', endHint: 'h', now: 0, width: 900, height: 93, ...over,
})

test('every band picture fits the size limit and carries its fonts', async () => {
  for (const sky of ['dawn', 'sunrise', 'day', 'rose', 'bluehour', 'crescent'] as const) {
    for (const phase of ['cover', 'reading', 'done'] as const) {
      const svg = bandSvg(model({ sky, phase, thikrId: '75', times: 1 }))
      expect(svg.length).toBeLessThan(131072)
      expect(svg).toContain('font-family: "Tajawal"')
    }
  }
  // The finale carries the stars and the rising dua; the done row after it is still.
  expect(bandSvg(model({ phase: 'done', finaleMs: 0 }))).toContain('class="rise-msg"')
  expect(bandSvg(model({ phase: 'done', finaleMs: 0 }))).toContain('class="fall"')
  expect(bandSvg(model({ phase: 'done' }))).toContain('class="done-row"')
  expect(bandSvg(model({ phase: 'done' }))).not.toContain('class="fall"')
  // The lab's gallery card rule would paint over the sky on the done row.
  expect(bandSvg(model({ phase: 'done' }))).not.toContain('.card {background: var(--panel)')
})

const read = (thikrId: string, width: number, extra: Partial<Parameters<typeof bandHeight>[0]> = {}) =>
  bandHeight({ phase: 'reading', thikrId, period: 'morning', textSize: 14, ...extra }, width)

test('the open band stands at one height for every thikr', async () => {
  for (const width of [860, 500]) {
    const heights = ATHKAR.flatMap(t => (['morning', 'evening'] as const).map(period => read(t.id, width, { period })))
    expect(new Set(heights).size).toBe(1)
  }
  // The same at both widths, and whatever the count: 91 is the shortest, 75 and 77 the longest.
  expect(read('91', 860)).toBe(read('75', 500))
  expect(read('77', 500, { period: 'evening' })).toBe(read('91', 860))
  // 77px at 14px (the old band with its circles row was about 93).
  expect(read('91', 860)).toBe(77)
  expect(read('75', 500)).toBe(77)
  expect(bandHeight({ phase: 'done', thikrId: '75', period: 'morning' }, 900)).toBe(56)
})

test('the default text size is 14; a thikr shrinks only to fit the two-line area, to a floor of 9', async () => {
  expect(SIZE_DEFAULT).toBe(14)
  expect(readSize(undefined)).toBe(14)
  expect(readSize('30')).toBe(14)
  const fit = (thikrId: string, width: number, textSize = 14, period: 'morning' | 'evening' = 'morning') => fitOf({ thikrId, period, textSize }, width)
  // What fits in two rows keeps the person's size.
  expect(fit('91', 860).size).toBe(14)
  expect(fit('75', 860).size).toBe(14)
  expect(fit('91', 500, 28).size).toBe(28)
  // The rest shrinks, and only as far as needed: one step bigger would not fit.
  for (const [id, period] of [['75', 'morning'], ['77', 'evening'], ['77', 'morning']] as const) {
    for (const width of [860, 500]) {
      const f = fit(id, width, 14, period)
      expect(f.size).toBeLessThanOrEqual(14)
      expect(f.size).toBeGreaterThanOrEqual(9)
      expect(f.rows * 1.7 * f.size).toBeLessThanOrEqual(f.area)
      if (f.size < 14) expect(fit(id, width, 14, period).size + 0.5).toBeGreaterThan(f.size)
    }
  }
  expect(fit('77', 500, 14, 'evening').size).toBeLessThan(14)
  // The area stays that of the person's size, and the floor holds.
  expect(fit('75', 300, 28).area).toBe(Math.ceil(2 * 1.7 * 28))
  expect(fit('75', 200, 12).size).toBe(9)
  // The shrunk size reaches the picture.
  const f = fit('77', 500, 14, 'evening')
  expect(bandSvg(model({ thikrId: '77', period: 'evening', textSize: 14, width: 500, height: read('77', 500) }))).toContain(`--fs:${f.size}px`)
})

test('the × lights when the pointer is over it', async () => {
  expect(bandSvg(model({ hoverClose: true }))).toContain('class="x xabs hot"')
  expect(bandSvg(model({}))).not.toContain('xabs hot"')
  const m = model({ width: 860, height: 92, card: { ch: 8.4, lh: 20 } })
  // Cell (0,0) is over the ×; a cell far along is not.
  const a = closeArea(m)
  const near = pixelOf(m, 2, 1, 100, 5)
  expect(near.px >= a.x0 && near.px <= a.x1 && near.py >= a.y0 && near.py <= a.y1).toBe(true)
  const far = pixelOf(m, 40, 1, 100, 5)
  expect(far.px > a.x1).toBe(true)
  // Folded, the whole row's height is the ×'s.
  expect(closeArea({ phase: 'reading', isActive: false, restHeight: 24 }).y1).toBe(24)
})

test('clicks on the picture find the × and nothing else', async () => {
  const hits = hitsFor(model({}))
  const at = (x: number, y: number) => hits.find(h => x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1)?.act
  expect(hits).toHaveLength(1)
  expect(at(16, 14)).toEqual({ act: 'hide' })
  // The bottom of the open band is the line and the pill: a press there counts.
  expect(at(300, 70)).toBeUndefined()
  expect(at(600, 20)).toBeUndefined()
})

const pillOf = (svg: string) => /<span class="pill"[^>]*>([^<]*)<\/span>/.exec(svg)?.[1]

test('the head of the progress line carries the repetitions left, and there are no circles', async () => {
  // 87 is said three times: after one count two are left.
  const svg = bandSvg(model({ thikrId: '87', times: 3, count: 1, position: '١٦ مِنْ ٢٢' }))
  expect(pillOf(svg)).toBe('٢')
  expect(svg).not.toContain('class="nb')
  expect(svg).not.toContain('class="nbs"')
  expect(svg).not.toContain('class="choice"')
  expect(svg).not.toContain('class="sub"')
  // Nothing counted: all of them; a hundred, 37 in: 63 left; said once: ١ then ٠.
  expect(pillOf(bandSvg(model({ times: 3, count: 0 })))).toBe('٣')
  expect(pillOf(bandSvg(model({ times: 100, count: 37 })))).toBe('٦٣')
  expect(pillOf(bandSvg(model({ times: 1, count: 0 })))).toBe('١')
  expect(pillOf(bandSvg(model({ times: 1, count: 1 })))).toBe('٠')
  // The position sits at the line's left end, as a label of its own.
  expect(svg).toContain('<span class="pos">١٦ مِنْ ٢٢</span>')
  // The pill slides with the glow, and a redraw carries it on rather than restarting it.
  expect(bandSvg(model({ glowMs: 300, progress: 40, from: 30 }))).toContain('--p:40%;--from:30%;animation-delay:-300ms')
  // Held back from both ends of the line so it is never clipped.
  expect(bandSvg(model({}))).toContain('clamp(20px, var(--p), calc(100% - 20px))')
  // The folded row has no pill, and neither do the cover and the done row.
  expect(pillOf(bandSvg(model({ isActive: false, restHeight: 24 })))).toBeUndefined()
  expect(pillOf(bandSvg(model({ phase: 'cover' })))).toBeUndefined()
  expect(pillOf(bandSvg(model({ phase: 'done' })))).toBeUndefined()
})

test('the cover stands at the open reading height, whatever the text, and its words fit the width', async () => {
  const cover = (period: 'morning' | 'evening', width: number, textSize = 14) => bandHeight({ phase: 'cover', thikrId: '75', period, textSize }, width)
  for (const width of [860, 500]) {
    expect(cover('morning', width)).toBe(read('75', width))
    expect(cover('evening', width)).toBe(read('91', width))
  }
  expect(cover('morning', 860)).toBe(77)
  expect(cover('morning', 860, 20)).toBe(read('75', 860, { textSize: 20 }))
  // Full size where there is room, shrunk together just enough where there is not, to a floor.
  expect(coverFit(900)).toBe(1)
  expect(coverFit(500)).toBe(1)
  expect(coverFit(380)).toBeLessThan(1)
  expect(coverFit(500)).toBeGreaterThanOrEqual(9 / 10.5)
  expect(Math.abs(coverFit(200) - 9 / 10.5)).toBeLessThan(0.001)
  expect(bandSvg(model({ phase: 'cover', width: 400, height: 77 }))).toContain(`--cv:${coverFit(400)}`)
  expect(bandSvg(model({ phase: 'cover', width: 400, height: 77 }))).toContain('max(9px, calc(26px * var(--cv, 1)))')
})

test('on the folded row the × hides the band and anywhere else opens it', async () => {
  const hits = hitsFor(model({ isActive: false, restHeight: 24 }))
  const at = (x: number, y: number) => hits.find(h => x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1)?.act
  expect(at(16, 12)).toEqual({ act: 'hide' })
  expect(at(384, 12)).toBeUndefined()
  expect(at(600, 12)).toBeUndefined()
  // The moon would sit on the position: the folded sky has none.
  expect(bandSvg(model({ isActive: false, restHeight: 24 }))).toContain('.band.band.rest.bg-crescent::before { display: none; }')
})

// Verse-end markers: ( + Arabic-Indic number + ), after every numbered verse.
const MARK = /(([٠-٩]+))/g
const marksOf = (id: string) => [...ATHKAR.find(t => t.id === id)!.text.matchAll(MARK)].map(m => m[1])

test('the short surahs number every verse, the last one included', async () => {
  expect(marksOf('76-ikhlas')).toEqual(['١', '٢', '٣', '٤'])
  expect(marksOf('76-falaq')).toEqual(['١', '٢', '٣', '٤', '٥'])
  expect(marksOf('76-nas')).toEqual(['١', '٢', '٣', '٤', '٥', '٦'])
  for (const id of ['76-ikhlas', '76-falaq', '76-nas']) {
    const text = ATHKAR.find(t => t.id === id)!.text
    expect(text.endsWith(')')).toBe(true)
    expect(text.includes('۝')).toBe(false)
  }
})

test('the basmala stays unnumbered and Ayat al-Kursi carries its verse number', async () => {
  for (const id of ['76-ikhlas', '76-falaq', '76-nas']) {
    const basmala = ATHKAR.find(t => t.id === id)!.text.split('\n')[0]
    expect(basmala).toBe('بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ')
  }
  const kursi = ATHKAR.find(t => t.id === '75')!.text
  expect(marksOf('75')).toEqual(['٢٥٥'])
  expect(kursi.endsWith('الْعَظِيمُ (٢٥٥)')).toBe(true)
})

test('the end verse stays on one line: the hint goes first, then the verse shrinks to fit', async () => {
  const hint = '/athkar evening reset to read again'
  const wide = doneFit(END, hint, 860)
  expect(wide.size).toBe(19)
  expect(wide.hint).toBe(hint)
  for (const width of [500, 380]) {
    const fit = doneFit(END, hint, width)
    expect(fit.size).toBeLessThanOrEqual(19)
    expect(fit.size).toBeGreaterThanOrEqual(9)
    // The hint is dropped before the verse shrinks.
    if (fit.hint === '') expect(doneFit(END, '', width).size).toBe(fit.size)
    const html = bandSvg(model({ phase: 'done', end: END, endHint: hint, width }))
    expect(html).toContain(`--ds:${fit.size}px`)
    expect(html).toContain('class="cite"')
    expect(html).toContain('white-space: nowrap')
  }
  expect(doneFit(END, hint, 380).hint).toBe('')
  expect(doneFit(END, hint, 380).size).toBeLessThan(19)
  expect(doneFit(END, hint, 100).size).toBeGreaterThanOrEqual(9)
  // The finale's message stays one line, shrunk to the width.
  expect(finaleSize(END, 860)).toBeLessThanOrEqual(30)
  expect(finaleSize(END, 380)).toBeLessThan(finaleSize(END, 860))
  expect(finaleSize(END, 380)).toBeGreaterThanOrEqual(9)
})

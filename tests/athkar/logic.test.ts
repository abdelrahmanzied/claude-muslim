import { expect, test } from 'claude-code/testing'

import { ATHKAR } from '../../src/features/athkar/data.ts'
import { arabicDigits, dayOf, emptyReading, listFor, overall, periodAt, readDay, shouldAdvance, skyAt, step, textOf } from '../../src/features/athkar/logic.ts'
import type { Reading } from '../../src/features/athkar/logic.ts'
import { bandHeight, bandSvg } from '../../src/features/athkar/band.ts'
import type { BandModel } from '../../src/features/athkar/band.ts'
import { hitsFor } from '../../src/features/athkar/install.tsx'
import { circlesFor, lookFor } from '../../src/features/athkar/look.ts'

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
  expect(ATHKAR.filter(t => t.choices).map(t => t.id)).toEqual(['92'])
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

test('a picked count replaces the thikr\'s times, and only its own choices', async () => {
  const at92 = { ...emptyReading(), index: listFor('morning').findIndex(t => t.id === '92') }
  expect(step('morning', at92, { act: 'choose', times: 100 }).choices['92']).toBe(100)
  expect(step('morning', at92, { act: 'choose', times: 7 }).choices['92']).toBeUndefined()
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

test('a hundred shows ten circles, the current one filling', async () => {
  const look = lookFor('sky', 'orange', 'crescent', true, false)
  const circles = circlesFor(35, 100, look)
  expect(circles).toHaveLength(10)
  expect(circles.slice(0, 3).every(c => c.state === 'done')).toBe(true)
  expect(circles[3]).toMatchObject({ state: 'filling', label: arabicDigits(35) })
  expect(circles[4]?.state).toBe('open')
})

const model = (over: Partial<BandModel>): BandModel => ({
  phase: 'reading', period: 'morning', sky: 'crescent', style: 'sky', accent: 'orange', isDark: true, isActive: true, hasBegun: true,
  title: 't', thikrId: '91', text: 'x', position: '١ مِنْ ٢٢', count: 3, times: 100, choices: [10, 100], progress: 30, from: 20,
  end: 'e', endHint: 'h', now: 0, width: 900, height: 93, ...over,
})

test('every band picture fits the size limit and carries its fonts', async () => {
  for (const sky of ['dawn', 'sunrise', 'day', 'rose', 'bluehour', 'crescent'] as const) {
    for (const phase of ['cover', 'reading', 'done'] as const) {
      const svg = bandSvg(model({ sky, phase, thikrId: '75', times: 1, choices: [] }))
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

test('the band grows with its text and shrinks with the width', async () => {
  const long = bandHeight({ phase: 'reading', thikrId: '75', period: 'morning', times: 1 }, 900)
  expect(long).toBeGreaterThan(bandHeight({ phase: 'reading', thikrId: '98', period: 'morning', times: 10 }, 900))
  expect(bandHeight({ phase: 'reading', thikrId: '75', period: 'morning', times: 1 }, 500)).toBeGreaterThan(long)
  expect(bandHeight({ phase: 'done', thikrId: '75', period: 'morning', times: 1 }, 900)).toBe(56)
  // A larger text size wraps sooner and takes taller lines.
  expect(bandHeight({ phase: 'reading', thikrId: '75', period: 'morning', times: 1, textSize: 24 }, 900)).toBeGreaterThan(long)
})

test('clicks on the picture find the × and the 10 | 100 switch', async () => {
  const hits = hitsFor(model({}))
  const at = (x: number, y: number) => hits.find(h => x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1)?.act
  expect(at(16, 14)).toEqual({ act: 'hide' })
  // Measured in a browser: 10 at 372–396, 100 at 343–370, rows 56–75.
  expect(at(384, 65)).toEqual({ act: 'choose', times: 10 })
  expect(at(356, 65)).toEqual({ act: 'choose', times: 100 })
  expect(at(600, 20)).toBeUndefined()
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

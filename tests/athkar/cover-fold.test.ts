import { expect, test } from 'claude-code/testing'

import { bandHeight, bandSvg, foldedHintSize, frameOf, heightOf, isFolded } from '../../src/features/athkar/band.ts'
import type { BandModel } from '../../src/features/athkar/band.ts'
import { END } from '../../src/features/athkar/logic.ts'
import { hitsFor } from '../../src/features/athkar/install.tsx'

const cover = (over: Partial<BandModel> = {}, width = 500): BandModel => {
  const m: BandModel = {
    phase: 'cover', period: 'morning', sky: 'day', style: 'sky', accent: 'orange', isDark: false, isActive: false, hasBegun: false,
    title: 'أَذْكَارُ الصَّبَاحِ', thikrId: '75', text: 'x', position: '١ مِنْ ٢٢', count: 0, times: 1, progress: 10, from: 10,
    end: 'e', endHint: 'h', endNote: 'n', now: 0, width, height: 0, restHeight: 24, textSize: 14, card: { ch: 8.4, lh: 20 }, ...over,
  }
  m.height = bandHeight(m, width)

  return m
}

test('a faded cover folds to one slim row, an active one stands at the full height', () => {
  const faded = cover()
  const lit = cover({ isActive: true })
  expect(isFolded(faded)).toBe(true)
  expect(isFolded(lit)).toBe(false)
  expect(heightOf(faded)).toBe(24)
  expect(heightOf(lit)).toBe(77)
  expect(frameOf(faded).height).toBeLessThan(frameOf(lit).height / 2)
})

test('the folded cover has the title, a one-line hint and the progress line; the open one the keys', () => {
  const folded = bandSvg(cover({ hasBegun: true }))
  expect(folded).toContain('class="peek cv-peek"')
  expect(folded).toContain('click to continue')
  expect(folded).not.toContain('class="cover cv-inline"')
  expect(bandSvg(cover())).toContain('click to start')
  const open = bandSvg(cover({ isActive: true }))
  expect(open).toContain('class="cover cv-inline"')
  expect(open).not.toContain('class="peek cv-peek"')
})

test('folded, only the × is a hit area', () => {
  const hits = hitsFor(cover())
  expect(hits).toHaveLength(1)
  expect(hits[0]?.y1).toBe(24)
})

test('the folded hint fits the width, 13px down to the 9px floor', () => {
  expect(foldedHintSize('click to continue', 860)).toBe(13)
  expect(foldedHintSize('click to continue', 380)).toBe(13)
  expect(foldedHintSize('click to continue', 200)).toBeGreaterThanOrEqual(9)
  expect(foldedHintSize('click to continue', 200)).toBeLessThan(13)
  expect(foldedHintSize('click to continue', 60)).toBe(9)
})

test('the done row folds too while faded: the note alone on one slim row; the finale never folds', () => {
  const end = END
  const faded = cover({ phase: 'done', end, endNote: 'أَتْمَمْتَ وِرْدَكَ ✓ · مَوْعِدُنَا الصَّبَاحُ' })
  const lit = cover({ phase: 'done', end, isActive: true })
  expect(heightOf(faded)).toBe(24)
  expect(heightOf(lit)).toBe(77)
  const svg = bandSvg(faded)
  expect(svg).toContain('class="peek dn-peek"')
  expect(svg).not.toContain(END)
  expect(svg).not.toContain('class="pill"')
  expect(svg).not.toContain('البقرة')
  expect(svg).toContain('<span class="pk-text">أَتْمَمْتَ وِرْدَكَ ✓ · مَوْعِدُنَا الصَّبَاحُ</span>')
  expect(svg).not.toContain('reset')
  expect(svg).not.toContain('class="done-row')
  expect(bandSvg(lit)).toContain('class="done-row"')
  expect(bandSvg(lit)).toContain(`<span class="big">${END}</span>`)
  expect(bandSvg(lit)).not.toContain('class="cite"')
  const finale = cover({ phase: 'done', end, finaleMs: 500 })
  expect(isFolded(finale)).toBe(false)
})

test('the closing greeting takes the athkar text color and face, not the main color', () => {
  const svg = bandSvg(cover({ phase: 'done', isActive: true }))
  expect(svg).toMatch(/\.done-row \.big \{[^}]*color: var\(--b-ink\)/)
  expect(svg).toMatch(/\.done-row \.big \{[^}]*font-family: var\(--font-band/)
})

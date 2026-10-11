import { expect, test } from 'claude-code/testing'

import { ATHKAR } from '../../src/features/athkar/data.ts'
import { END } from '../../src/features/athkar/logic.ts'
import { bandHeight, bandSvg, coverFit, doneFit, finaleSize, fitOf, frameOf, heightOf, isFolded } from '../../src/features/athkar/band.ts'
import type { BandModel } from '../../src/features/athkar/band.ts'
import { SIZE_DEFAULT } from '../../src/config.ts'

// The size concept: the text is a fixed 14px and the band a fixed height; a long
// thikr shrinks to fit the two-line box, to the floor.

const SIZES = [14]
const WIDTHS = [320, 380, 500, 860, 1200]
const PERIODS = ['morning', 'evening'] as const
const IDS = ATHKAR.map(t => t.id)
const FLOOR = 9
const LINE = 1.7
const CARD = { ch: 8.4, lh: 20 }

const reading = (thikrId: string, period: 'morning' | 'evening', textSize: number) => ({ phase: 'reading' as const, thikrId, period, textSize })

test('the open band is one height per size: not per thikr, period or width', () => {
  for (const size of SIZES) {
    const heights = new Set<number>()
    for (const id of IDS) for (const period of PERIODS) for (const width of WIDTHS) heights.add(bandHeight(reading(id, period, size), width))
    expect(heights.size).toBe(1)
  }
})

test('the text box is two lines of the size, and the band is that box plus the fixed frame', () => {
  for (const size of SIZES) {
    const { area } = fitOf({ thikrId: '91', period: 'morning', textSize: size }, 860)
    expect(area).toBe(Math.ceil(2 * LINE * size))
    // The band minus the box is the same fixed room (frame, padding, progress line) at every size.
    expect(bandHeight(reading('91', 'morning', size), 860) - area).toBe(77 - Math.ceil(2 * LINE * SIZE_DEFAULT))
  }
})

test('the text never exceeds the size, and the box is the same for every thikr and width', () => {
  for (const size of SIZES) {
    const areas = new Set<number>()
    for (const id of IDS) {
      for (const period of PERIODS) {
        for (const width of WIDTHS) {
          const f = fitOf({ thikrId: id, period, textSize: size }, width)
          expect(f.size).toBeLessThanOrEqual(size)
          areas.add(f.area)
        }
      }
    }
    expect(areas.size).toBe(1)
  }
})

test('a thikr that fits at the size keeps exactly that size; one that does not shrinks only as far as it must', () => {
  for (const size of SIZES) {
    for (const id of IDS) {
      for (const period of PERIODS) {
        for (const width of WIDTHS) {
          const f = fitOf({ thikrId: id, period, textSize: size }, width)
          if (f.size < size) {
            // Shrunk text moves in half-pixel steps and is only ever a fitted or floor size.
            expect((f.size * 2) % 1).toBe(0)
          } else {
            expect(f.size).toBe(size)
          }
        }
      }
    }
  }
  // Short ones keep the size at any width; long ones shrink at the narrow one.
  for (const width of WIDTHS) expect(fitOf({ thikrId: '91', period: 'morning', textSize: 14 }, width).size).toBe(14)
  expect(fitOf({ thikrId: '77', period: 'evening', textSize: 14 }, 380).size).toBeLessThan(14)
  expect(fitOf({ thikrId: '75', period: 'morning', textSize: 14 }, 320).size).toBeLessThan(14)
})

test('the fitted text fits the box: rows times line height within the area, no overflow', () => {
  const overflows: string[] = []
  for (const size of SIZES) {
    for (const id of IDS) {
      for (const period of PERIODS) {
        for (const width of WIDTHS) {
          const f = fitOf({ thikrId: id, period, textSize: size }, width)
          if (f.rows * LINE * f.size > f.area) overflows.push(`${id}/${period} size ${size} width ${width}: ${f.rows} rows at ${f.size}px = ${(f.rows * LINE * f.size).toFixed(1)} > ${f.area}`)
        }
      }
    }
  }
  expect(overflows).toEqual([])
})

test('a narrower window keeps the height and never a bigger font', () => {
  for (const size of SIZES) {
    for (const id of IDS) {
      for (const period of PERIODS) {
        for (let i = 1; i < WIDTHS.length; i++) {
          const narrow = fitOf({ thikrId: id, period, textSize: size }, WIDTHS[i - 1]!)
          const wide = fitOf({ thikrId: id, period, textSize: size }, WIDTHS[i]!)
          expect(narrow.size).toBeLessThanOrEqual(wide.size)
          expect(narrow.area).toBe(wide.area)
        }
      }
    }
  }
  // Every width, not only the grid: 200 to 1400 in steps of 10.
  for (const id of IDS) {
    let last = 0
    for (let width = 200; width <= 1400; width += 10) {
      const f = fitOf({ thikrId: id, period: 'evening', textSize: 14 }, width)
      expect(f.size).toBeGreaterThanOrEqual(last)
      last = f.size
    }
  }
})

test('there is no size setting: /athkar size is refused and the help does not offer it', async ($) => {
  const run = async (args: string) => String((await $.command.run({ command: 'athkar', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })).text)
  for (const args of ['size 20', 'size 14', 'size']) {
    const text = await run(args)
    expect(text).not.toContain('size')
  }
})

test('folded, the reading and the cover are one 24px row at every size, thikr and width', () => {
  const folded = (phase: 'reading' | 'cover', size: number, id: string, width: number) => {
    const m = { phase, isActive: false, restHeight: 24, thikrId: id, period: 'morning' as const, textSize: size }

    return { m, height: bandHeight(m, width), width }
  }
  for (const phase of ['reading', 'cover'] as const) {
    for (const size of SIZES) {
      for (const id of ['75', '91']) {
        for (const width of WIDTHS) {
          const { m, height } = folded(phase, size, id, width)
          expect(isFolded(m)).toBe(true)
          // The open height follows the size; the folded row ignores it.
          expect(heightOf({ ...m, height })).toBe(24)
          expect(frameOf({ ...m, width, height, card: CARD }).height).toBe(24 + CARD.lh)
        }
      }
    }
  }
})

test('the folded row takes its text from fixed pixel sizes, not from the setting, so 28 cannot clip it', () => {
  const m = (textSize: number): BandModel => ({
    phase: 'reading', period: 'morning', sky: 'day', style: 'sky', accent: 'orange', isDark: false, isActive: false, hasBegun: true,
    title: 't', thikrId: '75', text: 'x', position: '١', count: 0, times: 3, progress: 0, from: 0, end: 'e', endHint: 'h', now: 0,
    width: 500, height: 0, restHeight: 24, textSize, card: CARD,
  })
  const css = bandSvg(m(14))
  // Fixed 15px at 1.6 is 24px: exactly the row; and no rule ties the peek's text to the size.
  expect(css).toContain('font-size: 15px; line-height: 1.6')
  expect(css).toContain('class="peek"')
  const strip = (svg: string) => svg.replace(/--fs:[0-9.]+px/, '').replace(/--th:[0-9.]+px/, '')
  expect(strip(bandSvg(m(28)))).toBe(strip(bandSvg(m(12))))
  expect(bandSvg(m(28))).toContain('height="44"')
  expect(bandSvg(m(12))).toContain('height="44"')
})

test('cover and done rows: fixed height per size and width; the words on one line, fitted to the width', () => {
  const END_HINT = '/athkar evening reset to read again'
  for (const size of SIZES) {
    const open = bandHeight(reading('91', 'morning', size), 860)
    for (const period of PERIODS) {
      for (const id of IDS) {
        for (const width of WIDTHS) {
          expect(bandHeight({ phase: 'cover', thikrId: id, period, textSize: size }, width)).toBe(open)
          // The done row is the reading's height whatever the thikr or width.
          expect(bandHeight({ phase: 'done', thikrId: id, period, textSize: size }, width)).toBe(77)
        }
      }
    }
  }
  let lastCover = 0
  let lastDone = 0
  let lastFinale = 0
  for (let width = 100; width <= 1400; width += 10) {
    const c = coverFit(width)
    expect(c).toBeGreaterThanOrEqual(FLOOR / 10.5 - 0.001)
    expect(c).toBeLessThanOrEqual(1)
    expect(c).toBeGreaterThanOrEqual(lastCover)
    lastCover = c
    const d = doneFit(END, END_HINT, width)
    expect(d.size).toBeGreaterThanOrEqual(FLOOR)
    expect(d.size).toBeLessThanOrEqual(19)
    expect(d.size).toBeGreaterThanOrEqual(lastDone)
    lastDone = d.size
    const f = finaleSize(END, width)
    expect(f).toBeGreaterThanOrEqual(FLOOR)
    expect(f).toBeLessThanOrEqual(30)
    expect(f).toBeGreaterThanOrEqual(lastFinale)
    lastFinale = f
  }
  for (const width of WIDTHS) {
    const svg = bandSvg({
      phase: 'done', period: 'morning', sky: 'day', style: 'sky', accent: 'orange', isDark: false, isActive: true, hasBegun: true,
      title: 't', thikrId: '75', text: 'x', position: '١', count: 0, times: 1, progress: 100, from: 100, end: END, endHint: END_HINT, now: 0,
      width, height: 56, textSize: 14,
    })
    expect(svg).toContain(`--ds:${doneFit(END, END_HINT, width).size}px`)
    expect(svg).toContain('white-space: nowrap')
  }
})

test('frameOf: the picture is the band plus the card line, at the width given', () => {
  for (const size of SIZES) {
    for (const width of WIDTHS) {
      for (const phase of ['reading', 'cover', 'done'] as const) {
        const m = { phase, isActive: true, restHeight: 24, thikrId: '75', period: 'morning' as const, textSize: size }
        const height = bandHeight(m, width)
        const bare = frameOf({ ...m, width, height })
        expect(bare.width).toBe(width)
        expect(bare.height).toBe(height)
        const card = frameOf({ ...m, width, height, card: CARD, drawWidth: width })
        expect(card.width).toBe(width)
        expect(card.height).toBe(height + CARD.lh)
        // Without drawWidth the picture reaches a column past the band at each side.
        expect(frameOf({ ...m, width, height, card: CARD }).width).toBe(Math.round(width + 2 * CARD.ch))
      }
    }
  }
})

test('the picture declares exactly the frame it was sized to: a viewBox, and no growth', () => {
  const heightOfSvg = (svg: string) => Number(/<svg [^>]*height="([0-9.]+)"/.exec(svg)?.[1])
  const widthOfSvg = (svg: string) => Number(/<svg [^>]*width="([0-9.]+)"/.exec(svg)?.[1])
  const boxOf = (svg: string) => /viewBox="0 0 ([0-9.]+) ([0-9.]+)"/.exec(svg)
  for (const size of SIZES) {
    for (const width of WIDTHS) {
      for (const [id, period] of [['75', 'morning'], ['77', 'evening'], ['83', 'morning'], ['91', 'evening'], ['91', 'morning']] as const) {
        for (const phase of ['reading', 'cover', 'done'] as const) {
          for (const isActive of [true, false]) {
            const m: BandModel = {
              phase, period, sky: 'crescent', style: 'sky', accent: 'orange', isDark: true, isActive, hasBegun: true,
              title: 't', thikrId: id, text: 'x', position: '١ مِنْ ٢٢', count: 1, times: 100, progress: 30, from: 20,
              end: END, endHint: 'h', now: 0, width, height: 0, restHeight: 24, textSize: size, card: CARD,
            }
            m.height = bandHeight(m, width)
            const svg = bandSvg(m)
            const f = frameOf(m)
            const box = boxOf(svg)
            expect(box).not.toBeNull()
            expect(Number(box?.[1])).toBe(f.width)
            expect(Number(box?.[2])).toBe(f.height)
            expect(heightOfSvg(svg)).toBe(f.height)
            expect(widthOfSvg(svg)).toBe(f.width)
            // The picture's height is the band's (or the folded row's) plus the card line.
            expect(f.height).toBe(Math.round(heightOf(m) + CARD.lh))
          }
        }
      }
    }
  }
})

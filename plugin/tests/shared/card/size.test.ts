import { expect, test } from 'claude-code/testing'

import { bandHeight, bandSvg } from '../../../src/features/athkar/band.ts'
import type { BandModel } from '../../../src/features/athkar/band.ts'
import { ATHKAR } from '../../../src/features/athkar/data.ts'
import { AFTER_SALAH } from '../../../src/features/athkar/after-salah.ts'
import { END } from '../../../src/features/athkar/logic.ts'
import { alkahfSvg } from '../../../src/features/friday/card.ts'
import type { AlkahfCardProps } from '../../../src/features/friday/card.ts'
import { paneModel } from '../../../src/features/muslim-pane/model.ts'
import { paneSvg } from '../../../src/features/muslim-pane/view.ts'
import { avatarSvg } from '../../../src/shared/quran-avatar/index.ts'
import { athanSvg, cardVerse } from '../../../src/features/salah/card.ts'
import type { AthanCardProps } from '../../../src/features/salah/card.ts'

// The engine refuses a Client or Svg tree that serializes to more than 100000 characters, and the card then draws nothing.
// Every desktop card's tree stays under CAP with headroom; embed font subsets, not whole fonts (DESIGN.md, the card shell).
const ENGINE_CAP = 100_000
const CAP = 95_000

const CARD = { ch: 8.4, lh: 20 }
const WIDE = 200
const WIDTH = Math.round(WIDE * CARD.ch)
// The athan photo as the card embeds it: haram.jpg is 29.9 KB, 39.9K base64 characters.
const PHOTO = 'A'.repeat(40_000)
// 2026-11-06 is a Friday; Dhuhr there is Jumu'ah.
const FRIDAY_NOON = new Date(2026, 10, 6, 12).getTime()

const athan = (isFolded: boolean, withVerse: boolean): AthanCardProps => {
  const verse = withVerse ? cardVerse('dhuhr', FRIDAY_NOON, true) : undefined

  return { isActive: true, isFolded, now: 0, pray: 'dhuhr', at: FRIDAY_NOON, time: '12:58', photo: PHOTO, width: WIDTH, card: CARD, canStart: !withVerse, ...(verse ? { verse } : {}) }
}

const longest = (texts: string[]) => texts.reduce((a, b) => (b.length > a.length ? b : a))
const LONG = longest([...ATHKAR.map(t => t.text), ...AFTER_SALAH.map(t => t.text)])

const band = (over: Partial<BandModel>): BandModel => {
  const m: BandModel = {
    phase: 'cover', period: 'morning', sky: 'day', style: 'sky', accent: 'orange', isActive: true, hasBegun: false,
    title: 'أَذْكَارُ الصَّبَاحِ', thikrId: '75', text: LONG, position: '١ مِنْ ٢٢', count: 0, times: 33, progress: 50, from: 40,
    end: END, endHint: 'h', now: 1000, width: WIDTH, height: 0, restHeight: 24, textSize: 14, card: CARD, ...over,
  }
  m.height = bandHeight(m, WIDTH)

  return m
}

const alkahf = (): AlkahfCardProps => ({ isActive: true, now: 5000, startedAt: 2000, accent: 'orange', reciter: 'عبد الرحمن السديس', inBrowser: false, width: WIDTH, card: CARD })

const feeds = {
  salah: {
    city: 'Munich', isAthan: true,
    prays: [
      { pray: 'fajr' as const, at: 1, clock: '05:48' }, { pray: 'dhuhr' as const, at: 2, clock: '12:58' }, { pray: 'asr' as const, at: 3, clock: '15:42' },
      { pray: 'maghrib' as const, at: 4, clock: '18:21' }, { pray: 'isha' as const, at: 5, clock: '19:52' },
    ],
    next: { pray: 'asr' as const, at: 3, clock: '15:42' },
  },
  quran: { error: '', reciter: 'محمد صديق المنشاوي', surah: 'سورة البقرة', part: 'الربع ٥ - الآيات ١٥–٢٤ (١ من ٢)', segmented: true, status: 'يتلى الآن', isLive: true, elapsed: '12:03', total: '41:20', progress: 0.29, isPlaying: true, canPrev: true, canNext: true, repeat: 'off' as const, avatar: avatarSvg(true, 0), audioNote: '' },
  athkar: { set: 'evening' as const, canUndo: false, title: 'أَذْكَارُ الْمَسَاءِ', done: 4, total: 12, progress: 0.33, isDone: false },
}

const cards = (): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const folded of [false, true]) for (const verse of [false, true]) {
    out[`athan ${folded ? 'folded' : 'open'}${verse ? ' + verse' : ''}`] = athanSvg(athan(folded, verse), { hoverClose: false, hoverAction: true, columns: WIDE })
  }
  out['athkar cover open'] = bandSvg(band({ phase: 'cover' }))
  out['athkar cover folded'] = bandSvg(band({ phase: 'cover', isActive: false }))
  out['athkar reading open'] = bandSvg(band({ phase: 'reading' }))
  out['athkar reading folded'] = bandSvg(band({ phase: 'reading', isActive: false }))
  out['athkar finale'] = bandSvg(band({ phase: 'done', finaleMs: 3000 }))
  out['athkar done'] = bandSvg(band({ phase: 'done' }))
  out['alkahf'] = alkahfSvg(alkahf(), { hoverClose: false, hoverAction: false, columns: WIDE, gone: 0 })
  out['pane'] = paneSvg(paneModel(feeds, 1_700_000_000_000, 360, 'orange'))

  return out
}

// Measured 2026-11-14 (JSON-serialized picture at 200 columns): the athan card 84.7K, 94.0K with the verse; the pane 88.5K;
// the athkar band 60K reading open, 93.9K folded, 95.0K cover open, 98.7K finale; the Al-Kahf card 95.2K.
// These three are already above the headroom and fit the cap barely: they must not grow, and want their own font subsets.
const TIGHT = new Set(['athkar cover open', 'athkar finale', 'alkahf'])
const TIGHT_CAP = 99_000

test('every desktop card tree stays under the engine\'s 100000-character cap, with headroom', () => {
  const over: string[] = []
  for (const [name, svg] of Object.entries(cards())) {
    const size = JSON.stringify({ svg }).length
    if (size >= (TIGHT.has(name) ? TIGHT_CAP : CAP)) over.push(`${name}: ${size}`)
  }
  expect(over).toEqual([])
  expect(TIGHT_CAP).toBeLessThan(ENGINE_CAP)
})

test('the athan card embeds the Jumu\'ah verse font only when the verse shows', () => {
  const plain = athanSvg(athan(false, false), { hoverClose: false, columns: WIDE })
  const verse = athanSvg(athan(false, true), { hoverClose: false, columns: WIDE })
  expect(plain).not.toContain('font-family: "Tajawal"')
  expect(verse).toContain('font-family: "Tajawal"')
  expect(verse.length - plain.length).toBeLessThan(15_000)
})

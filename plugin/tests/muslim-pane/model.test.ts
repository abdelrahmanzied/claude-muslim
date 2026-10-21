import { expect, test } from 'claude-code/testing'
import type { PanelSalah } from '../../src/shared/panel/signal.ts'
import { athkarCard, paneModel, prayerCard, prayerRows, quranCard, textLines, untilText, widthOf } from '../../src/features/muslim-pane/model.ts'

const MIN = 60_000
const DAY = 1_700_000_000_000
const salah = (now: number): PanelSalah => {
  const at = (h: number) => now + h * 60 * MIN
  return {
    city: 'Munich',
    prays: [
      { pray: 'fajr', at: at(-10), clock: '05:48' },
      { pray: 'dhuhr', at: at(-3), clock: '12:58' },
      { pray: 'asr', at: at(1.2), clock: '15:42' },
      { pray: 'maghrib', at: at(4), clock: '18:21' },
      { pray: 'isha', at: at(6), clock: '19:52' },
    ],
    next: { pray: 'asr', at: at(1.2), clock: '15:42' },
    isAthan: true,
  }
}

test('the countdown reads in hours and minutes, in Arabic with Arabic digits', () => {
  expect(untilText(72 * MIN)).toBe('بعد ١ س ١٢ د')
  expect(untilText(12 * MIN)).toBe('بعد ١٢ د')
  expect(untilText(60 * MIN)).toBe('بعد ١ س ٠ د')
  expect(untilText(59_000)).toBe('بعد أقل من دقيقة')
  expect(untilText(Number.NaN)).toBe('بعد أقل من دقيقة')
})

test('past prays are done, the next is marked, the rest are upcoming', () => {
  const rows = prayerRows(salah(DAY), DAY)
  expect(rows.map(r => r.state)).toEqual(['done', 'done', 'next', 'upcoming', 'upcoming'])
  expect(rows.map(r => r.name)).toEqual(['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء'])
  expect(rows[2]!.time).toBe('١٥:٤٢')
})

test('after Isha every row is done and the next is tomorrow, not a row', () => {
  const late = salah(DAY)
  const now = DAY + 10 * 60 * MIN
  const tomorrow = { pray: 'fajr' as const, at: now + 7 * 60 * MIN, clock: '05:49' }
  const rows = prayerRows({ ...late, next: tomorrow }, now)
  expect(rows.every(r => r.state === 'done')).toBe(true)
  const card = prayerCard({ ...late, next: tomorrow }, now)
  expect(card.nextName).toBe('الفجر')
  expect(card.until).toBe('بعد ٧ س ٠ د')
})

test('the prayer card names the city and the next prayer in the main values', () => {
  const card = prayerCard(salah(DAY), DAY)
  expect(card).toMatchObject({ isSet: true, city: 'Munich', nextName: 'العصر', nextTime: '١٥:٤٢', until: 'بعد ١ س ١٢ د', isAthan: true })
  expect(prayerCard(null, DAY)).toMatchObject({ isSet: false, rows: [] })
})

test('athkar shows done of total in Arabic digits and clamps the bar', () => {
  expect(athkarCard(null)).toEqual({ isAvailable: false })
  const card = athkarCard({ set: 'evening', canUndo: false, title: 'أَذْكَارُ الْمَسَاءِ', done: 4, total: 12, progress: 1.4, isDone: false })
  expect(card).toMatchObject({ isAvailable: true, fraction: '٤ / ١٢', progress: 1 })
})

test('quran card is unavailable without a feed and clamps progress with one', () => {
  expect(quranCard(null)).toEqual({ isAvailable: false })
  const card = quranCard({ error: '', reciter: 'a', surah: 'سورة البقرة', part: '', segmented: false, status: 'متوقف', isLive: false, elapsed: '00:01', total: '00:10', progress: -1, isPlaying: true, canPrev: true, canNext: false, repeat: 'off', avatar: '', audioNote: '' })
  expect(card).toMatchObject({ isAvailable: true, progress: 0, canNext: false })
})

test('width follows the pane columns within bounds, and a bad size falls back', () => {
  expect(widthOf(50)).toBe(420)
  expect(widthOf(10)).toBe(240)
  expect(widthOf(1000)).toBe(1200)
  expect(widthOf(0)).toBe(360)
  expect(widthOf(Number.NaN)).toBe(360)
  expect(widthOf(undefined, 480)).toBe(480)
})

test('the terminal fallback lists the three cards and passes Arabic through the shown path', () => {
  const model = paneModel({ salah: salah(DAY), quran: null, athkar: null }, DAY, 360, 'orange')
  const lines = textLines(model, text => `<${text}>`)
  expect(lines[0]).toBe('**Muslim**')
  expect(lines).toContain('**<الصلاة>** · Munich')
  expect(lines).toContain('▸ <العصر> <١٥:٤٢>')
  expect(lines).toContain('✓ <الفجر> <٠٥:٤٨>')
  expect(lines).toContain('Not ready. /quran (desktop player)')
  expect(lines).toContain('Not ready. /athkar')
  const unset = textLines(paneModel({ salah: null, quran: null, athkar: null }, DAY, 360, 'orange'), t => t)
  expect(unset).toContain('Not set up. /salah city')
})

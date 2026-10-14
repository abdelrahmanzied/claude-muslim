import { ATHKAR } from './data.ts'
import type { Period, Thikr } from './data.ts'

// One period's reading for the day, kept in `$.store` and `$.state`.
export type Reading = {
  // Which thikr is shown, an index into `listFor(period)`.
  index: number
  // Counts so far, by thikr id.
  counts: Record<string, number>
  // Every thikr was counted to its end.
  isDone: boolean
  // × hid the band; the reading is kept.
  isHidden: boolean
}

// A day's athkar: both periods. A day runs from 05:00 to 05:00, so the
// evening athkar read after midnight still belong to the evening before.
export type Day = {
  day: string
  morning: Reading
  evening: Reading
}

export type Sky = 'dawn' | 'sunrise' | 'day' | 'rose' | 'bluehour' | 'crescent'

// What the reader posts: a count, an undo, a move, a hide.
export type Act =
  | { act: 'count' }
  | { act: 'back' }
  | { act: 'next' }
  | { act: 'previous' }
  | { act: 'hide' }

// The morning athkar are read 05:00 to 17:00, the evening ones 17:00 to 05:00.
export const MORNING_FROM = 5
export const EVENING_FROM = 17

// Wait after a thikr's last count before the next one shows.
export const ADVANCE_MS = 650

export const TITLE: Record<Period, string> = {
  morning: 'أَذْكَارُ الصَّبَاحِ',
  evening: 'أَذْكَارُ الْمَسَاءِ',
}

export const END = '﴿رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ﴾ — البقرة ١٢٧'

// The folded done row: finished, and when the next period comes.
export const END_NOTE: Record<Period, string> = {
  morning: 'أَتْمَمْتَ وِرْدَكَ ✓ · مَوْعِدُنَا الْمَسَاءُ',
  evening: 'أَتْمَمْتَ وِرْدَكَ ✓ · مَوْعِدُنَا الصَّبَاحُ',
}

export const periodAt = (hour: number): Period => (hour >= MORNING_FROM && hour < EVENING_FROM ? 'morning' : 'evening')

// The sky follows the clock, hour with minutes as a fraction.
export const skyAt = (hour: number): Sky => {
  if (hour >= 4 && hour < 6) return 'dawn'
  if (hour >= 6 && hour < 8) return 'sunrise'
  if (hour >= 8 && hour < 17) return 'day'
  if (hour >= 17 && hour < 18) return 'rose'
  if (hour >= 18 && hour < 19) return 'bluehour'

  return 'crescent'
}

// The athkar day a local time belongs to: the date five hours earlier.
export const dayOf = (date: Date): string => {
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours() - MORNING_FROM, date.getMinutes())
  const pad = (n: number) => String(n).padStart(2, '0')

  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`
}

export const emptyReading = (): Reading => ({ index: 0, counts: {}, isDone: false, isHidden: false })

export const emptyDay = (day: string): Day => ({ day, morning: emptyReading(), evening: emptyReading() })

// A stored day, or a fresh one when it is from another day or unreadable.
export const readDay = (raw: unknown, day: string): Day => {
  if (!raw || typeof raw !== 'object') return emptyDay(day)
  const stored = raw as Partial<Day>
  if (stored.day !== day) return emptyDay(day)

  return { day, morning: readReading(stored.morning), evening: readReading(stored.evening) }
}

const readReading = (raw: unknown): Reading => {
  if (!raw || typeof raw !== 'object') return emptyReading()
  const r = raw as Partial<Reading>

  return {
    index: Number.isInteger(r.index) && (r.index ?? 0) >= 0 ? r.index ?? 0 : 0,
    counts: isNumbers(r.counts) ? r.counts : {},
    isDone: r.isDone === true,
    isHidden: r.isHidden === true,
  }
}

const isNumbers = (value: unknown): value is Record<string, number> =>
  !!value && typeof value === 'object' && Object.values(value).every(n => typeof n === 'number')

export const listFor = (period: Period): readonly Thikr[] =>
  ATHKAR.filter(thikr => thikr.periods === 'both' || thikr.periods === period)

export const textOf = (thikr: Thikr, period: Period) => (period === 'evening' && thikr.evening ? thikr.evening : thikr.text)

// How many times a thikr is said: only what the data says. (A reading saved by an
// earlier build may carry a `choices` key; it is ignored.)
export const timesOf = (thikr: Thikr) => thikr.times

export const countOf = (thikr: Thikr, reading: Reading) => reading.counts[thikr.id] ?? 0

// Each thikr is an equal share of the whole, and a share fills as it is
// counted: 33 of 100 fills a third of that thikr's share. 0 to 1.
export const overall = (period: Period, reading: Reading) => {
  const list = listFor(period)
  const sum = list.reduce((total, thikr) => total + Math.min(countOf(thikr, reading) / timesOf(thikr), 1), 0)

  return list.length === 0 ? 0 : sum / list.length
}

export const hasBegun = (reading: Reading) => Object.values(reading.counts).some(n => n > 0)

export const currentOf = (period: Period, reading: Reading): Thikr => {
  const list = listFor(period)

  return list[Math.min(reading.index, list.length - 1)] ?? list[0]!
}

const isComplete = (thikr: Thikr, reading: Reading) => countOf(thikr, reading) >= timesOf(thikr)

const withCount = (reading: Reading, thikr: Thikr, n: number): Reading => ({
  ...reading,
  counts: { ...reading.counts, [thikr.id]: n },
})

// One step of the reader. Counting past the end moves on; the last thikr's
// last count, once moved on from, finishes the period.
export const step = (period: Period, reading: Reading, act: Act): Reading => {
  const list = listFor(period)
  const last = list.length - 1
  const thikr = currentOf(period, reading)
  const n = countOf(thikr, reading)
  const times = timesOf(thikr)

  if (act.act === 'hide') return { ...reading, isHidden: true }
  if (reading.isDone) return act.act === 'back' || act.act === 'previous' ? { ...reading, isDone: false } : reading

  switch (act.act) {
    case 'count':
      return n >= times ? step(period, reading, { act: 'next' }) : withCount(reading, thikr, n + 1)
    case 'next':
      if (reading.index < last) return { ...reading, index: reading.index + 1 }

      return isComplete(thikr, reading) ? { ...reading, isDone: true } : reading
    case 'previous':
      return { ...reading, index: Math.max(0, reading.index - 1) }
    case 'back':
      if (n > 0) return withCount(reading, thikr, n - 1)

      return { ...reading, index: Math.max(0, reading.index - 1) }
  }
}

// After a count: whether the reader should move on by itself shortly.
export const shouldAdvance = (period: Period, before: Reading, after: Reading) => {
  const thikr = currentOf(period, after)

  return after.index === before.index && !after.isDone && countOf(thikr, after) > countOf(thikr, before) && isComplete(thikr, after)
}

export const isAct = (value: unknown): value is Act => {
  if (!value || typeof value !== 'object') return false
  const { act } = value as { act?: unknown }
  return act === 'count' || act === 'back' || act === 'next' || act === 'previous' || act === 'hide'
}

const DIGITS = '٠١٢٣٤٥٦٧٨٩'

export const arabicDigits = (n: number | string) => String(n).replace(/\d/g, d => DIGITS[Number(d)] ?? d)

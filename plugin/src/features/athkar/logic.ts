import { IN_MS } from '../../shared/pray/line.ts'
import { mayOpenByItself } from '../../shared/pray/first-run.ts'
import { ATHKAR } from './data.ts'
import type { Period, Thikr } from './data.ts'
import { afterSalah } from './after-salah.ts'
import type { SalahAthkarTimes, SalahLast } from '../../../types'
import type { Fard } from '../../shared/pray/names.ts'
import { ATHKAR_TITLE } from '../../shared/athkar/titles.ts'

export type AthkarSet = Period | 'afterSalah'
export type ReaderThikr = Pick<Thikr, 'id' | 'times' | 'text' | 'evening' | 'note'> & { periods?: Thikr['periods'] }
export type AfterSalahReading = Reading & { pray: Fard | null; at: number | null }

// One period's reading for the day, kept in `$.store` and `$.state`.
export type Reading = {
  // Optional context carried through the shared step functions by the after-salah slot.
  pray?: Fard | null
  at?: number | null
  // Which thikr is shown, an index into `listFor(period)`.
  index: number
  // Counts so far, by thikr id.
  counts: Record<string, number>
  // Every thikr was counted or explicitly confirmed complete.
  isDone: boolean
  // × hid the band; the reading is kept.
  isHidden: boolean
}

// A day's athkar: morning, evening and one after-salah slot. A day turns at Fajr (05:00 without prayer times), so the
// evening athkar read after midnight still belong to the evening before.
export type Day = {
  day: string
  morning: Reading
  evening: Reading
  afterSalah: AfterSalahReading
}

export type Sky = 'dawn' | 'sunrise' | 'day' | 'rose' | 'bluehour' | 'crescent'

// What the reader posts: a count, an undo, a move, a hide.
export type Act =
  | { act: 'count' }
  | { act: 'back' }
  | { act: 'next' }
  | { act: 'previous' }
  | { act: 'hide' }
  | { act: 'finish' }
  | { act: 'resume' }

// Without prayer times, morning athkar are read 05:00 to 17:00, the evening ones 17:00 to 05:00.
export const MORNING_FROM = 5
export const EVENING_FROM = 17

// Wait after a thikr's last count before the next one shows.
export const ADVANCE_MS = 650

export const TITLE: Record<AthkarSet, string> = ATHKAR_TITLE

export const END = 'تَقَبَّلَ اللَّهُ 🤲'

// The folded done row: finished, and when the next period comes.
export const END_NOTE: Record<AthkarSet, string> = {
  afterSalah: 'أَتْمَمْتَ وِرْدَكَ ✓',
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

const HOUR_MS = 3600_000

// Ordered phase starts, in epoch milliseconds. Compressed phases may be empty.
export const skyBoundaries = (times: SalahAthkarTimes) => {
  const fajr = times.fajr
  const maghrib = Math.max(fajr, Math.min(times.maghrib, times.nextFajr))
  const realSunrise = Number.isFinite(times.sunrise) && times.sunrise > fajr && times.sunrise < maghrib
  const sunrise = Math.min(maghrib, realSunrise ? times.sunrise : fajr + 1.5 * HOUR_MS)
  const rose = Math.max(sunrise, maghrib - HOUR_MS)
  const day = Math.min(sunrise + 2 * HOUR_MS, rose)
  const isha = Number.isFinite(times.isha) ? times.isha : maghrib + HOUR_MS
  const crescent = Math.max(maghrib, Math.min(maghrib + HOUR_MS, isha, times.nextFajr))
  return { fajr, sunrise, day, rose, maghrib, crescent }
}

// Real-clock callers use prayer timestamps; skyAt retains the exact fixed hours.
export const skyOn = (date: Date, times?: SalahAthkarTimes | null): Sky => {
  if (!times) return skyAt(date.getHours() + date.getMinutes() / 60)
  const at = date.getTime()
  const bounds = skyBoundaries(times)
  if (at < bounds.fajr) return 'crescent'
  if (at < bounds.sunrise) return 'dawn'
  if (at < bounds.day) return 'sunrise'
  if (at < bounds.rose) return 'day'
  if (at < bounds.maghrib) return 'rose'
  if (at < bounds.crescent) return 'bluehour'
  return 'crescent'
}

// Exact prayer bounds, or the existing local clock without a saved place.
export const periodOn = (date: Date, times?: SalahAthkarTimes | null): Period => times
  ? date.getTime() >= times.fajr && date.getTime() < times.maghrib ? 'morning' : 'evening'
  : periodAt(date.getHours())

export const nextPeriodAt = (date: Date, times?: SalahAthkarTimes | null): number => {
  if (times) return date.getTime() < times.fajr ? times.fajr : date.getTime() < times.maghrib ? times.maghrib : times.nextFajr
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours() < MORNING_FROM ? MORNING_FROM : date.getHours() < EVENING_FROM ? EVENING_FROM : MORNING_FROM)
  if (date.getHours() >= EVENING_FROM) next.setDate(next.getDate() + 1)
  return next.getTime()
}

// A period began at/after the answer iff its first eligible boundary has passed.
// Bounds belong to answer - 1 ms, so an answer exactly at a boundary includes it.
export const mayOpenPeriod = (pending: boolean, remindFrom: number | null, now: Date, answerBounds?: SalahAthkarTimes | null): boolean => {
  if (remindFrom === null) return mayOpenByItself(pending, null, null)
  const firstStart = nextPeriodAt(new Date(remindFrom - 1), answerBounds)
  return now.getTime() >= firstStart && mayOpenByItself(pending, remindFrom, firstStart)
}

// The prayer-place day at Fajr, or the original local 05:00 boundary.
export const dayOf = (date: Date, times?: SalahAthkarTimes | null): string => {
  if (times) return date.getTime() < times.fajr ? times.previousDay : times.day
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours() - MORNING_FROM, date.getMinutes())
  const pad = (n: number) => String(n).padStart(2, '0')

  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`
}

export const emptyReading = (): Reading => ({ index: 0, counts: {}, isDone: false, isHidden: false })

export const emptyAfterSalah = (): AfterSalahReading => ({ ...emptyReading(), pray: null, at: null })

export const emptyDay = (day: string): Day => ({ day, morning: emptyReading(), evening: emptyReading(), afterSalah: emptyAfterSalah() })

// A stored day, or a fresh one when it is from another day or unreadable.
export const readDay = (raw: unknown, day: string): Day => {
  if (!raw || typeof raw !== 'object') return emptyDay(day)
  const stored = raw as Partial<Day>
  if (stored.day !== day) return emptyDay(day)

  if (!validReading(stored.morning) || !validReading(stored.evening) || !validReading(stored.afterSalah)) return emptyDay(day)
  return { day, morning: readReading(stored.morning), evening: readReading(stored.evening), afterSalah: readAfterSalah(stored.afterSalah) }
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

// A reading missing a field starts fresh; an unknown extra key is dropped, never fatal.
const validReading = (raw: unknown): boolean => {
  if (!raw || typeof raw !== 'object') return false
  const r = raw as Partial<Reading>
  return Number.isInteger(r.index) && (r.index ?? -1) >= 0 && isNumbers(r.counts)
    && typeof r.isDone === 'boolean' && typeof r.isHidden === 'boolean'
}

const readAfterSalah = (raw: unknown): AfterSalahReading => {
  if (!raw || typeof raw !== 'object') return emptyAfterSalah()
  const r = raw as Partial<AfterSalahReading>
  const prayers: readonly string[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
  if (r.pray == null && r.at == null) return { ...readReading(raw), pray: null, at: null }
  if (!r.pray || !prayers.includes(r.pray) || typeof r.at !== 'number' || !Number.isFinite(r.at)) return emptyAfterSalah()
  return { ...readReading(raw), pray: r.pray, at: r.at }
}

export const sameSlot = (a: { pray?: Fard | null; at?: number | null } | null | undefined, b: { pray?: Fard | null; at?: number | null } | null | undefined): boolean =>
  (a?.pray ?? null) === (b?.pray ?? null) && (a?.at ?? null) === (b?.at ?? null)

// A missing last prayer at midnight keeps the reading until the athkar day turns.
export const syncAfterSalah = (day: Day, last: SalahLast | null): Day => {
  if (!last || sameSlot(day.afterSalah, last)) return day
  return { ...day, afterSalah: { ...emptyReading(), pray: last?.pray ?? null, at: last?.at ?? null } }
}

// The card and the automatic reader hand off at the same prayer-based deadline.
// A matching explicit request starts early; it cannot carry over to the next prayer.
export const offerStart = (last: SalahLast, requested?: SalahLast | null) =>
  sameSlot(requested, last) ? last.at : last.at + IN_MS

// An untouched automatic offer ends thirty minutes from the athan, including time spent waiting.
export const offerEnd = (slot: Pick<SalahLast, 'at'>) => slot.at + 2 * IN_MS

// With the after-salah reminder off, only an explicit start or a begun slot takes the band.
export const setAt = (now: Date, day: Day, last: SalahLast | null, chosen?: AthkarSet, requested?: SalahLast | null, times?: SalahAthkarTimes | null, remindAfterSalah = true): AthkarSet => {
  if (chosen) return chosen
  const slot = day.afterSalah
  const period = periodOn(now, times)
  if (hasBegun(slot) && !slot.isDone && !slot.isHidden) return 'afterSalah'
  // Unless asked for from the athan card, after-salah waits while a morning or evening reading is being counted.
  const isAsked = !!last && sameSlot(requested, last)
  const isBusy = (r: Reading) => hasBegun(r) && !r.isDone && !r.isHidden
  const isOffered = isAsked || hasBegun(slot) || remindAfterSalah && !!last && now.getTime() < offerEnd(last)
  return last && now.getTime() >= offerStart(last, requested) && isOffered && !slot.isDone && !slot.isHidden && (isAsked || !isBusy(day[period]))
    ? 'afterSalah' : period
}

// An after-salah slot finished in front of the person, held on the band.
export type FinishedHold = { pray: Fard | null; at: number | null; until: number }

// The finished slot keeps the band through its finale (until `until`) and its
// done row while the band is lit; once it rests, morning or evening come back.
export const holdsFinished = (hold: FinishedHold | undefined, slot: AfterSalahReading, now: number, isActive: boolean) =>
  !!hold && slot.isDone && sameSlot(slot, hold) && (now < hold.until || isActive)

const isNumbers =(value: unknown): value is Record<string, number> =>
  !!value && typeof value === 'object' && Object.values(value).every(n => typeof n === 'number')

export const listFor = (period: AthkarSet, reading?: Reading): readonly ReaderThikr[] =>
  period === 'afterSalah' ? afterSalah(reading?.pray ?? null) : ATHKAR.filter(thikr => thikr.periods === 'both' || thikr.periods === period)

export const textOf = (thikr: ReaderThikr, period: AthkarSet) => (period === 'evening' && thikr.evening ? thikr.evening : thikr.text)

export const countOf = (thikr: ReaderThikr, reading: Reading) => reading.counts[thikr.id] ?? 0

// Each thikr is an equal share of the whole, and a share fills as it is
// counted: 33 of 100 fills a third of that thikr's share. 0 to 1.
export const overall = (period: AthkarSet, reading: Reading) => {
  const list = listFor(period, reading)
  const sum = list.reduce((total, thikr) => total + Math.min(countOf(thikr, reading) / thikr.times, 1), 0)

  return list.length === 0 ? 0 : sum / list.length
}

export const hasBegun = (reading: Reading) => Object.values(reading.counts).some(n => n > 0)

export const currentOf = (period: AthkarSet, reading: Reading): ReaderThikr => {
  const list = listFor(period, reading)

  return list[Math.min(reading.index, list.length - 1)] ?? list[0]!
}

const isComplete = (thikr: ReaderThikr, reading: Reading) => countOf(thikr, reading) >= thikr.times

const withCount = (reading: Reading, thikr: ReaderThikr, n: number): Reading => ({
  ...reading,
  counts: { ...reading.counts, [thikr.id]: n },
})

export const incomplete = (period: AthkarSet, reading: Reading) => listFor(period, reading).filter(t => !isComplete(t, reading))

// The only explicit finish operation: shared by the band and the pane.
export const finishReading = <R extends Reading>(period: AthkarSet, reading: R): R => ({
  ...reading,
  counts: { ...reading.counts, ...Object.fromEntries(listFor(period, reading).map(t => [t.id, t.times])) },
  isDone: true,
})

// The question belongs to the view, never Reading or the saved day.
export const asksToFinish = (period: AthkarSet, reading: Reading, act: Act) =>
  !reading.isDone && reading.index >= listFor(period, reading).length - 1 && incomplete(period, reading).length > 0
  && (act.act === 'next' || (act.act === 'count' && isComplete(currentOf(period, reading), reading)))

export type FinishQuestion = { day: string; period: AthkarSet; focus: 'finish' | 'resume'; blockedKey: string | undefined }
export const countKey = (key: string) => key === ' ' ? 'space' : key

// The host supplies key presses only, without key-up or repeat metadata.
// Never infer a release from a timeout: explicitly selecting a choice clears
// the entry-key latch. A different activation key is also a fresh choice.
export const questionKey = (q: FinishQuestion, key: string): { question?: FinishQuestion; act?: Act } => {
  if (key === 'right' || key === 'backspace') return {}
  if (key === 'tab' || key === 'left') return { question: { ...q, focus: q.focus === 'finish' ? 'resume' : 'finish', blockedKey: undefined } }
  if ((key === 'return' || countKey(key) === 'space') && countKey(key) !== q.blockedKey) return { act: { act: q.focus } }
  return { question: q }
}

// One step of the reader. Only a fully counted set finishes on next.
export const step = (period: AthkarSet, reading: Reading, act: Act): Reading => {
  const list = listFor(period, reading)
  const last = list.length - 1
  const thikr = currentOf(period, reading)
  const n = countOf(thikr, reading)
  const times = thikr.times

  if (act.act === 'finish') return finishReading(period, reading)
  if (act.act === 'resume') return { ...reading, index: Math.max(0, list.findIndex(t => !isComplete(t, reading))) }
  if (act.act === 'hide') return { ...reading, isHidden: true }
  if (reading.isDone) return act.act === 'back' || act.act === 'previous' ? { ...reading, isDone: false } : reading

  switch (act.act) {
    case 'count':
      return n >= times ? step(period, reading, { act: 'next' }) : withCount(reading, thikr, n + 1)
    case 'next':
      if (reading.index < last) return { ...reading, index: reading.index + 1 }

      return incomplete(period, reading).length === 0 ? { ...reading, isDone: true } : reading
    case 'previous':
      return { ...reading, index: Math.max(0, reading.index - 1) }
    case 'back':
      if (n > 0) return withCount(reading, thikr, n - 1)

      return { ...reading, index: Math.max(0, reading.index - 1) }
  }
}

// After a count: whether the reader should move on by itself shortly.
export const shouldAdvance = (period: AthkarSet, before: Reading, after: Reading) => {
  const thikr = currentOf(period, after)

  return after.index === before.index && !after.isDone && countOf(thikr, after) > countOf(thikr, before) && isComplete(thikr, after)
}

export const isAct = (value: unknown): value is Act => {
  if (!value || typeof value !== 'object') return false
  const { act } = value as { act?: unknown }
  return act === 'count' || act === 'back' || act === 'next' || act === 'previous' || act === 'hide' || act === 'finish' || act === 'resume'
}


export { arabicDigits } from '../../shared/digits/index.ts'

export const statusOf = (day: Day, period: AthkarSet) => {
  const reading = day[period]
  const list = listFor(period, reading)
  if (reading.isDone) return 'done ✓'
  const begun = list.filter(thikr => countOf(thikr, reading) > 0).length

  return `${begun === 0 ? 'not started' : `${reading.index + 1} of ${list.length}`}${reading.isHidden ? ' (hidden)' : ''}`
}

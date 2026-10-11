import type { Accent, Style } from './features/athkar/look.ts'
import { METHODS, PRAYS, type MethodId, type Pray } from './features/salah/methods.ts'
import { readPlace, type Place } from './features/salah/place.ts'
import type { Speed } from './features/thikr/rotation.ts'

// Typed view of the manifest's userConfig values, defaults filled in.
export type Options = {
  thikr: boolean
  thikrSpeed: Speed
  tashkeel: boolean
  thikrEnd: boolean
  thikrMode: Mode
  athkar: boolean
  athkarStyle: Style
  athkarColor: Accent
  salahShow: Show
  salahAthan: boolean
  salahPlace: Place | undefined
  salahMethod: MethodId | 'auto'
  salahAdjust: Record<Pray, number>
}

// When the pray line shows: `always` (next pray all day), a number (only that
// many minutes before a pray, counting down) or `off`.
export type Show = 'always' | 'off' | number

// `all`: every group in turn; `salawat`: one salawat for the whole turn.
export type Mode = 'all' | 'salawat'

export const SPEED_MIN = 1
export const SPEED_MAX = 60

export const readOptions = (raw: Record<string, unknown>): Options => ({
  thikr: raw.thikr !== false,
  thikrSpeed: readSpeed(raw.thikrSpeed),
  tashkeel: raw.tashkeel !== false,
  thikrEnd: raw.thikrEnd !== false,
  thikrMode: raw.thikrMode === 'salawat' ? 'salawat' : 'all',
  athkar: raw.athkar !== false,
  // 'outline' is the old name of 'frame'.
  athkarStyle: raw.athkarStyle === 'frame' || raw.athkarStyle === 'outline' ? 'frame' : 'sky',
  athkarColor: raw.athkarColor === 'green' || raw.athkarColor === 'gold' || raw.athkarColor === 'blue' ? raw.athkarColor : 'orange',
  salahShow: readShow(raw),
  // "salahAdhan" is the old saved key name (data, read as is).
  salahAthan: (raw.salahAthan ?? raw.salahAdhan) !== false,
  salahPlace: readPlace(raw.salahPlace),
  salahMethod: isMethod(raw.salahMethod) ? raw.salahMethod : 'auto',
  salahAdjust: readAdjust(raw.salahAdjust),
})

// The athkar's text size in pixels: fixed. A long thikr shrinks to fit the box; nothing else changes it.
export const SIZE_DEFAULT = 14

// `auto`, or whole seconds from SPEED_MIN to SPEED_MAX; anything else is auto.
export const readSpeed = (value: unknown): Speed => {
  const seconds = Number(value)
  if (value === undefined || value === 'auto' || !Number.isInteger(seconds)) return 'auto'

  return seconds >= SPEED_MIN && seconds <= SPEED_MAX ? seconds : 'auto'
}

export const SHOW_MIN = 1
export const SHOW_MAX = 720
export const SHOW_DEFAULT = 20
// With `always`, the countdown runs in the last minutes before a pray.
export const ALWAYS_COUNTDOWN = 20

// `always`, `off` or whole minutes from SHOW_MIN to SHOW_MAX; else undefined.
export const parseShow = (value: unknown): Show | undefined => {
  if (value === 'always' || value === 'off') return value
  const minutes = Number(value)

  return value !== '' && value !== null && typeof value !== 'boolean' && Number.isInteger(minutes) && minutes >= SHOW_MIN && minutes <= SHOW_MAX ? minutes : undefined
}

// `salahShow`; before it, the old `salah` mode (true, `reminder`, `before`,
// `countdown` meant minutes) and its `salahReminder` minutes are read.
export const readShow = (raw: Record<string, unknown>): Show => {
  const show = parseShow(raw.salahShow)
  if (show !== undefined) return show
  if (raw.salah === 'always' || raw.salah === 'off') return raw.salah
  if (raw.salah === false) return 'off'

  return parseShow(raw.salahReminder) ?? SHOW_DEFAULT
}

// The minutes the countdown runs before a pray; 0 when off.
export const countdownMinutes = (show: Show): number => (show === 'always' ? ALWAYS_COUNTDOWN : show === 'off' ? 0 : show)

export const isMethod = (value: unknown): value is MethodId => typeof value === 'string' && Object.hasOwn(METHODS, value)

// Six whole minutes, Fajr to Isha; anything else is 0.
export const readAdjust = (value: unknown): Record<Pray, number> => {
  const words = typeof value === 'string' ? value.trim().split(/\s+/) : []
  const entries = PRAYS.map((pray, i) => {
    const minutes = Number(words[i])

    return [pray, Number.isInteger(minutes) ? minutes : 0] as const
  })

  return Object.fromEntries(entries) as Record<Pray, number>
}

export const writeAdjust = (adjust: Record<Pray, number>): string => PRAYS.map(pray => adjust[pray]).join(' ')

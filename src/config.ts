import { METHODS, PRAYS, type MethodId, type Pray } from './features/salah/methods.ts'
import { readPlace, type Place } from './features/salah/place.ts'
import type { Speed } from './features/thikr/rotation.ts'

// Typed view of the manifest's userConfig values, defaults filled in.
export type Options = {
  thikr: boolean
  thikrSpeed: Speed
  thikrTashkeel: boolean
  thikrEnd: boolean
  thikrMode: Mode
  salah: SalahMode
  salahReminder: number
  salahAthan: boolean
  salahPlace: Place | undefined
  salahMethod: MethodId | 'auto'
  salahAdjust: Record<Pray, number>
}

// `always`: next pray all day; `before`: only in the reminder minutes before a pray; `off`: nothing.
export type SalahMode = 'always' | 'before' | 'off'

// `all`: every group in turn; `salawat`: one salawat for the whole turn.
export type Mode = 'all' | 'salawat'

export const SPEED_MIN = 1
export const SPEED_MAX = 60

export const readOptions = (raw: Record<string, unknown>): Options => ({
  thikr: raw.thikr !== false,
  thikrSpeed: readSpeed(raw.thikrSpeed),
  thikrTashkeel: raw.thikrTashkeel !== false,
  thikrEnd: raw.thikrEnd !== false,
  thikrMode: raw.thikrMode === 'salawat' ? 'salawat' : 'all',
  salah: readSalahMode(raw.salah),
  salahReminder: readReminder(raw.salahReminder),
  // "salahAdhan" is the old saved key name (data, read as is).
  salahAthan: (raw.salahAthan ?? raw.salahAdhan) !== false,
  salahPlace: readPlace(raw.salahPlace),
  salahMethod: isMethod(raw.salahMethod) ? raw.salahMethod : 'auto',
  salahAdjust: readAdjust(raw.salahAdjust),
})

// `auto`, or whole seconds from SPEED_MIN to SPEED_MAX; anything else is auto.
export const readSpeed = (value: unknown): Speed => {
  const seconds = Number(value)
  if (value === undefined || value === 'auto' || !Number.isInteger(seconds)) return 'auto'

  return seconds >= SPEED_MIN && seconds <= SPEED_MAX ? seconds : 'auto'
}

export const REMINDER_MIN = 5
export const REMINDER_MAX = 60
export const REMINDER_DEFAULT = 20

// `always`, `before` or `off`; the old `reminder` and the old boolean true read
// as before, false as off.
export const readSalahMode = (value: unknown): SalahMode => {
  if (value === 'always' || value === 'off') return value
  if (value === false) return 'off'

  return 'before'
}

// Whole minutes from REMINDER_MIN to REMINDER_MAX; anything else is the default.
export const readReminder = (value: unknown): number => {
  const minutes = Number(value)

  return value !== '' && value !== null && Number.isInteger(minutes) && minutes >= REMINDER_MIN && minutes <= REMINDER_MAX
    ? minutes
    : REMINDER_DEFAULT
}

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

import { METHODS, PRAYERS, type MethodId, type Prayer } from './features/salah/methods.ts'
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
  salahAdjust: Record<Prayer, number>
}

// `always`: next prayer all day; `reminder`: only in the reminder window; `off`: nothing.
export type SalahMode = 'always' | 'reminder' | 'off'

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

// `always`, `reminder` or `off`; the old boolean reads true as reminder, false as off.
export const readSalahMode = (value: unknown): SalahMode => {
  if (value === 'always' || value === 'off') return value
  if (value === false) return 'off'

  return 'reminder'
}

// Whole minutes from REMINDER_MIN to REMINDER_MAX; anything else is the default.
export const readReminder = (value: unknown): number => {
  const minutes = Number(value)

  return value !== '' && value !== null && Number.isInteger(minutes) && minutes >= REMINDER_MIN && minutes <= REMINDER_MAX
    ? minutes
    : REMINDER_DEFAULT
}

export const isMethod = (value: unknown): value is MethodId => typeof value === 'string' && Object.hasOwn(METHODS, value)

export const ADJUST_MAX = 60

// Six whole minutes, Fajr to Isha, each within ±ADJUST_MAX; anything else is 0.
export const readAdjust = (value: unknown): Record<Prayer, number> => {
  const words = typeof value === 'string' ? value.trim().split(/\s+/) : []
  const entries = PRAYERS.map((prayer, i) => {
    const minutes = Number(words[i])

    return [prayer, Number.isInteger(minutes) && Math.abs(minutes) <= ADJUST_MAX ? minutes : 0] as const
  })

  return Object.fromEntries(entries) as Record<Prayer, number>
}

export const writeAdjust = (adjust: Record<Prayer, number>): string => PRAYERS.map(prayer => adjust[prayer]).join(' ')

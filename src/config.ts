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
  salah: boolean
  salahNotify: boolean
  salahPlace: Place | undefined
  salahMethod: MethodId | 'auto'
  salahAdjust: Record<Prayer, number>
}

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
  salah: raw.salah !== false,
  salahNotify: raw.salahNotify !== false,
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

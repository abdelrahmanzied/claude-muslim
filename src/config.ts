import type { Accent, Style } from './features/athkar/look.ts'
import type { Speed } from './features/thikr/rotation.ts'

// Typed view of the manifest's userConfig values, defaults filled in.
export type Options = {
  thikr: boolean
  thikrSpeed: Speed
  thikrTashkeel: boolean
  thikrEnd: boolean
  thikrMode: Mode
  athkar: boolean
  athkarStyle: Style
  athkarColor: Accent
  athkarSize: number
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
  athkar: raw.athkar !== false,
  athkarStyle: raw.athkarStyle === 'outline' ? raw.athkarStyle : 'sky',
  athkarColor: raw.athkarColor === 'green' || raw.athkarColor === 'gold' || raw.athkarColor === 'blue' ? raw.athkarColor : 'orange',
  athkarSize: readSize(raw.athkarSize),
})

export const SIZE_MIN = 12
export const SIZE_MAX = 28
export const SIZE_DEFAULT = 14

// The athkar's text size in pixels, whole, from SIZE_MIN to SIZE_MAX; anything else is the default.
export const readSize = (value: unknown): number => {
  const size = Number(value)

  return Number.isInteger(size) && size >= SIZE_MIN && size <= SIZE_MAX ? size : SIZE_DEFAULT
}

// `auto`, or whole seconds from SPEED_MIN to SPEED_MAX; anything else is auto.
export const readSpeed = (value: unknown): Speed => {
  const seconds = Number(value)
  if (value === undefined || value === 'auto' || !Number.isInteger(seconds)) return 'auto'

  return seconds >= SPEED_MIN && seconds <= SPEED_MAX ? seconds : 'auto'
}

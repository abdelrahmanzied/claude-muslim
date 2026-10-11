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
})

// The athkar's text size in pixels: fixed. A long thikr shrinks to fit the box; nothing else changes it.
export const SIZE_DEFAULT = 14

// `auto`, or whole seconds from SPEED_MIN to SPEED_MAX; anything else is auto.
export const readSpeed = (value: unknown): Speed => {
  const seconds = Number(value)
  if (value === undefined || value === 'auto' || !Number.isInteger(seconds)) return 'auto'

  return seconds >= SPEED_MIN && seconds <= SPEED_MAX ? seconds : 'auto'
}

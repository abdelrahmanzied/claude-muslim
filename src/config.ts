import { isArabicFix, type ArabicFix } from './shared/arabic/terminal.ts'
import type { Speed } from './features/thikr/rotation.ts'

// Typed view of the manifest's userConfig values, defaults filled in.
export type Options = {
  arabicFix: ArabicFix
  thikr: boolean
  thikrSpeed: Speed
  thikrTashkeel: boolean
  thikrEnd: boolean
  thikrMode: Mode
}

// `all`: every group in turn; `salawat`: one salawat for the whole turn.
export type Mode = 'all' | 'salawat'

export const SPEED_MIN = 1
export const SPEED_MAX = 60

export const readOptions = (raw: Record<string, unknown>): Options => ({
  arabicFix: isArabicFix(raw.arabicFix) ? raw.arabicFix : 'auto',
  thikr: raw.thikr !== false,
  thikrSpeed: readSpeed(raw.thikrSpeed),
  thikrTashkeel: raw.thikrTashkeel !== false,
  thikrEnd: raw.thikrEnd !== false,
  thikrMode: raw.thikrMode === 'salawat' ? 'salawat' : 'all',
})

// `auto`, or whole seconds from SPEED_MIN to SPEED_MAX; anything else is auto.
export const readSpeed = (value: unknown): Speed => {
  const seconds = Number(value)
  if (value === undefined || value === 'auto' || !Number.isInteger(seconds)) return 'auto'

  return seconds >= SPEED_MIN && seconds <= SPEED_MAX ? seconds : 'auto'
}

// Typed view of the manifest's userConfig values, defaults filled in.
export type Options = {
  thikr: boolean
  thikrSpeed: number
  thikrTashkeel: boolean
  thikrEnd: boolean
}

export const SPEED_MIN = 1
export const SPEED_MAX = 60

export const readOptions = (raw: Record<string, unknown>): Options => ({
  thikr: raw.thikr !== false,
  thikrSpeed: clampSpeed(Number(raw.thikrSpeed ?? 3)),
  thikrTashkeel: raw.thikrTashkeel !== false,
  thikrEnd: raw.thikrEnd !== false,
})

export const clampSpeed = (seconds: number): number =>
  Number.isFinite(seconds) ? Math.min(SPEED_MAX, Math.max(SPEED_MIN, Math.round(seconds))) : 3

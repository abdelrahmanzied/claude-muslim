import { arabicDigits } from '../../shared/digits/index.ts'
import { dayKey } from '../../shared/friday/index.ts'
import { ISTIGHFAR } from './phrases.ts'
import type { IstighfarCount } from '../../../types'

// The day's istighfar count: how many times the phrase was shown, not said. Kept in `$.store`, one device day at a time.
export const ISTIGHFAR_KEY = 'istighfarCount'

// The count after one more showing: the saved count of this device day, or 0 on a new day (midnight local time).
export const nextCount = (saved: unknown, now: number): IstighfarCount => {
  const day = dayKey(now)
  const s = saved as Partial<IstighfarCount> | null | undefined
  const before = s?.day === day && typeof s.count === 'number' && Number.isFinite(s.count) && s.count > 0 ? Math.floor(s.count) : 0

  return { day, count: before + 1 }
}

// The spinning star between the phrase and the count: a Claude-like star that cycles back and forth. All five glyphs are single-width.
export const STAR_FRAMES: readonly string[] = ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢']

// How long each frame stays; the thikr ticker redraws this often in istighfar mode.
export const STAR_MS = 200

// The star at a moment: one frame every STAR_MS from the turn's start.
export const starAt = (now: number, turnStart: number): string =>
  STAR_FRAMES[Math.floor(Math.max(0, now - turnStart) / STAR_MS) % STAR_FRAMES.length] ?? '✻'

// The glyph the shaped line is made with; the frame of the moment replaces it, so the Arabic is shaped once per count.
export const STAR_SLOT = '✻'

// The line: the phrase, the star, then the count in Arabic-Indic digits.
export const istighfarLine = (count: number, star: string = STAR_SLOT): string => `${ISTIGHFAR} · ${star} ${arabicDigits(count)}`

// Which showing a moment falls in: the phrase renews every `everyMs` from the turn's start.
export const slotAt = (now: number, turnStart: number, everyMs: number): number => Math.floor(Math.max(0, now - turnStart) / Math.max(1, everyMs))

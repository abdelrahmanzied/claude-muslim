import type { Reciter } from './catalog.ts'
import { AUDIO_LIMIT_BYTES, CLIP_ERROR, timedSegments } from './segments.ts'

// Exact server matching is shared with playback; never match by a reader's name.
export { timingRead } from './segments.ts'
export type UnavailableReason = 'no-timing' | 'timing-error' | 'clip-too-big' | 'unreachable'
export type RecordingSupport = {
  readonly name: string
  readonly server: string
  readonly timingReadId: number | null
  readonly split: Readonly<Partial<Record<number, number>>>
  readonly unavailable: Readonly<Partial<Record<number, UnavailableReason>>>
}
export type SurahProbe = { sizeBytes: number | null; timings?: unknown; durationMs?: number | null }
export type SurahSupport = { kind: 'whole' } | { kind: 'split'; sizeBytes: number } | { kind: 'unavailable'; reason: UnavailableReason }

export function classifySurah(surah: number, probe: SurahProbe, readId: number | null): SurahSupport {
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) throw new Error('Surah must be 1–114')
  const { sizeBytes } = probe
  if (sizeBytes === null || !Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) return { kind: 'unavailable', reason: 'unreachable' }
  if (sizeBytes < AUDIO_LIMIT_BYTES) return { kind: 'whole' }
  if (readId === null) return { kind: 'unavailable', reason: 'no-timing' }
  try {
    // Includes shiftedTimings (surah 9), missing tails, zero-length ayat and
    // the existing conservative time/size ratio check that throws CLIP_ERROR.
    timedSegments(probe.timings, surah, sizeBytes, probe.durationMs)
    return { kind: 'split', sizeBytes }
  } catch (error) {
    return { kind: 'unavailable', reason: error instanceof Error && error.message === CLIP_ERROR ? 'clip-too-big' : 'timing-error' }
  }
}

export function classifyRecording(reciter: Reciter, readId: number | null, probes: Readonly<Record<number, SurahProbe>>): RecordingSupport {
  const split: Partial<Record<number, number>> = {}, unavailable: Partial<Record<number, UnavailableReason>> = {}
  for (let surah = 1; surah <= 114; surah++) {
    const probe = probes[surah]
    if (!probe) throw new Error(`Missing probe for ${reciter.key} surah ${surah}`)
    const result = classifySurah(surah, probe, readId)
    if (result.kind === 'split') split[surah] = result.sizeBytes
    if (result.kind === 'unavailable') unavailable[surah] = result.reason
  }
  return { name: reciter.name, server: reciter.server, timingReadId: readId, split, unavailable }
}

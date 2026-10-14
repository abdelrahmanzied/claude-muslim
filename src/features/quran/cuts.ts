import { parseFrame } from './mp3.ts'
import { cbrCheckpoint, type CbrStream } from './segment-mp3.ts'
import { AUDIO_LIMIT_BYTES, type Segment } from './segments.ts'

// Acoustic and I/O tunables live here, shared by the tool and offline checks.
export const CUT_OPTIONS = {
  frameMs: 20, floorPercentile: 0.03, speechPercentile: 0.85, floorMarginDb: 6, contrastDb: 10, energyFloor: 1e-12,
  minPauseMs: 200, edgeMs: 60, lengthWeight: 0.75, lengthCapMs: 2000,
  searchMs: [1500, 3000, 6000, 10000] as readonly number[],
  windowMs: 10000, wideWindowMs: 35000, clipMs: 4000, shiftRoundMs: 10,
  sampleRate: 16000, prefixBytes: 128 * 1024, tailBytes: 8192,
  concurrency: 4, timeoutMs: 15000, decodeTimeoutMs: 30000,
  retries: 3, backoffMs: 500, maxPcmBytes: 3 * 1024 * 1024, pcmToleranceMs: 60,
  syncBytes: 8192, timingBytes: 1024 * 1024, maxConcurrency: 16, progressMs: 20000,
  alignmentRangeMs: 12000, alignmentMaxOffsetMs: 32000, alignmentStepMs: 40, alignmentSpanMs: 35000,
  alignmentToleranceMs: 250, alignmentMinBoundaries: 2, alignmentMinCoverage: 0.65,
  alignmentOverrideMinBoundaries: 3, preservePauseChangeMs: 350,
  alignmentLengthBase: 0.25, alignmentLengthWeight: 0.75,
  alignmentPeakGap: 0.025, alignmentPeakSeparationMs: 1500, alignmentOffsetPenalty: 0.01,
  alignmentSnapMs: 750, confidentShiftMs: 750, confidentPauseMs: 400,
  fallbackLengthWeight: 1.5, fallbackLengthCapMs: 4000,
  algorithm: 'local-offset-v1',
  originalFloorPercentile: 0.1, originalContrastDb: 12,
  estimateBitrate: 128000, estimateMaxBitrate: 320000,
  estimateWideFractions: [0, 0.25, 0.5, 1] as readonly number[],
} as const
export type Pause = { startMs: number; endMs: number }
export type ChosenCut = { ms: number; shiftMs: number; pauseMs: number }
export type FramePoint = { byte: number; ms: number }
export type StoredCut = FramePoint & { shiftMs: number; pauseMs: number; startByte: number; startMs: number }
export type SurahCuts = {
  readonly sizeBytes: number; readonly etag: string | null; readonly readId: number
  readonly server: string; readonly mapVersion: number; readonly planHash: string
  readonly algorithm?: string
  readonly segments: readonly Segment[]
  readonly first: FramePoint | null; readonly last: FramePoint | null
  // cuts[i] is the internal boundary BEFORE segments[i + 1]. null means fallback.
  readonly cuts: readonly (StoredCut | null)[]
  readonly unresolved?: 'non-cbr' | 'scan-error'
}
export type CutsCatalog = Readonly<Record<string, Readonly<Partial<Record<number, SurahCuts>>>>>

export function findPauses(samples: Int16Array | Float32Array, sampleRate: number, options: Partial<Record<'frameMs' | 'floorPercentile' | 'floorMarginDb' | 'contrastDb' | 'minPauseMs', number>> = {}): Pause[] {
  const o = { ...CUT_OPTIONS, ...options }
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || o.frameMs <= 0 || o.floorPercentile < 0 || o.floorPercentile > 1) return []
  const width = Math.max(1, Math.round(sampleRate * o.frameMs / 1000)), scale = samples instanceof Int16Array ? 32768 : 1
  const energy: number[] = []
  for (let at = 0; at + width <= samples.length; at += width) {
    let sum = 0
    for (let j = 0; j < width; j++) { const v = samples[at + j]! / scale; sum += v * v }
    energy.push(10 * Math.log10(Math.max(sum / width, o.energyFloor)))
  }
  if (!energy.length || energy.some(v => !Number.isFinite(v))) return []
  const sorted = [...energy].sort((a, b) => a - b)
  const floor = sorted[Math.floor((sorted.length - 1) * o.floorPercentile)]!
  const speech = sorted[Math.floor((sorted.length - 1) * o.speechPercentile)]!
  // A constant tone/noise window must never classify itself as a pause.
  if (speech - floor < o.contrastDb) return []
  const threshold = Math.min(floor + o.floorMarginDb, speech - o.contrastDb)
  const ms = width * 1000 / sampleRate, pauses: Pause[] = []
  let start = -1
  for (let i = 0; i <= energy.length; i++) {
    if (i < energy.length && energy[i]! <= threshold) { if (start < 0) start = i; continue }
    // Discard window-edge silence: it could be decoder warm-up or a cropped word.
    if (start > 0 && i < energy.length && (i - start) * ms >= o.minPauseMs) pauses.push({ startMs: start * ms, endMs: i * ms })
    start = -1
  }
  return pauses
}

export function cutPauses(samples: Int16Array | Float32Array, sampleRate: number, mode: 'before' | 'after' = 'after'): Pause[] {
  const original = findPauses(samples, sampleRate, { floorPercentile: CUT_OPTIONS.originalFloorPercentile, contrastDb: CUT_OPTIONS.originalContrastDb })
  const extra = mode === 'after' ? findPauses(samples, sampleRate).filter(p => !original.some(q => p.startMs < q.endMs && p.endMs > q.startMs)) : []
  return [...original, ...extra].sort((a, b) => a.startMs - b.startMs)
}
export function pauseCacheKey(mode: 'before' | 'after'): string {
  const o = CUT_OPTIONS
  return shortHash(JSON.stringify([mode, o.frameMs, o.sampleRate, o.originalFloorPercentile, o.originalContrastDb, o.floorMarginDb, o.minPauseMs, o.speechPercentile, o.energyFloor, ...(mode === 'after' ? [o.algorithm, o.floorPercentile, o.contrastDb] : [])]))
}

// Frozen original chooser, retained for the offline before/after benchmark.
export function chooseNearestCut(pauses: readonly Pause[], targetMs: number, options: { searchMs?: readonly number[]; minPauseMs?: number; edgeMs?: number; lengthWeight?: number; lengthCapMs?: number } = {}): ChosenCut | null {
  const o = { ...CUT_OPTIONS, ...options }
  if (!Number.isFinite(targetMs)) return null
  for (const radius of o.searchMs) {
    const candidates = pauses.filter(p => Number.isFinite(p.startMs) && Number.isFinite(p.endMs) && p.endMs - p.startMs >= Math.max(o.minPauseMs, 2 * o.edgeMs)).map(p => {
      const ms = (p.startMs + p.endMs) / 2, pauseMs = p.endMs - p.startMs
      return { ms, shiftMs: ms - targetMs, pauseMs, score: Math.abs(ms - targetMs) - o.lengthWeight * Math.min(pauseMs, o.lengthCapMs) }
    }).filter(p => Math.abs(p.shiftMs) <= radius).sort((a, b) => a.score - b.score || Math.abs(a.shiftMs) - Math.abs(b.shiftMs) || a.ms - b.ms)
    const best = candidates[0]
    if (best) return { ms: best.ms, shiftMs: best.shiftMs, pauseMs: best.pauseMs }
  }
  return null
}

export type OffsetAlignment = { offsetMs: number; score: number; gap: number; matches: number; boundaries: number }
export function alignOffset(pauses: readonly Pause[], plannedStarts: readonly number[], targetMs: number, options: { windowStartMs?: number; windowEndMs?: number; rangeMs?: number; priorOffsetMs?: number } = {}): OffsetAlignment | null {
  const range = options.rangeMs ?? CUT_OPTIONS.alignmentRangeMs
  const prior = options.priorOffsetMs ?? 0
  const starts = [...new Set(plannedStarts)].filter(ms => Number.isFinite(ms) && ms > 0 && Math.abs(ms - targetMs) <= CUT_OPTIONS.alignmentSpanMs && ms >= (options.windowStartMs ?? -Infinity) && ms <= (options.windowEndMs ?? Infinity)).sort((a, b) => a - b)
  if (starts.length < CUT_OPTIONS.alignmentMinBoundaries) return null
  const candidates: OffsetAlignment[] = []
  for (let offsetMs = Math.ceil(Math.max(-CUT_OPTIONS.alignmentMaxOffsetMs, prior - range) / CUT_OPTIONS.alignmentStepMs) * CUT_OPTIONS.alignmentStepMs; offsetMs <= Math.min(CUT_OPTIONS.alignmentMaxOffsetMs, prior + range); offsetMs += CUT_OPTIONS.alignmentStepMs) {
    let sum = 0, weightSum = 0, matches = 0
    for (const start of starts) {
      const weight = 1 / (1 + Math.abs(start - targetMs) / CUT_OPTIONS.alignmentSpanMs)
      let best = 0
      for (const p of pauses) {
        const length = p.endMs - p.startMs
        if (length < CUT_OPTIONS.minPauseMs) continue
        const distance = Math.abs(start + offsetMs - (p.startMs + p.endMs) / 2)
        const proximity = Math.max(0, 1 - distance / (length / 2 + CUT_OPTIONS.alignmentToleranceMs))
        const quality = Math.min(length, CUT_OPTIONS.lengthCapMs) / CUT_OPTIONS.lengthCapMs
        best = Math.max(best, proximity * (CUT_OPTIONS.alignmentLengthBase + CUT_OPTIONS.alignmentLengthWeight * quality))
      }
      if (best > 0) matches++
      sum += weight * best; weightSum += weight
    }
    if (matches / starts.length < CUT_OPTIONS.alignmentMinCoverage) continue
    const score = sum / weightSum - CUT_OPTIONS.alignmentOffsetPenalty * Math.abs(offsetMs) / CUT_OPTIONS.alignmentMaxOffsetMs
    candidates.push({ offsetMs, score, gap: 0, matches, boundaries: starts.length })
  }
  candidates.sort((a, b) => b.score - a.score || Math.abs(a.offsetMs) - Math.abs(b.offsetMs) || a.offsetMs - b.offsetMs)
  const best = candidates[0]
  if (!best) return null
  const competitor = candidates.find(c => Math.abs(c.offsetMs - best.offsetMs) >= CUT_OPTIONS.alignmentPeakSeparationMs)
  const gap = best.score - (competitor?.score ?? 0)
  return gap >= CUT_OPTIONS.alignmentPeakGap ? { ...best, gap } : null
}

export function chooseCut(pauses: readonly Pause[], targetMs: number, options: { searchMs?: readonly number[]; minPauseMs?: number; edgeMs?: number; lengthWeight?: number; lengthCapMs?: number; plannedStarts?: readonly number[]; windowStartMs?: number; windowEndMs?: number; priorOffsetMs?: number } = {}): ChosenCut | null {
  if (options.plannedStarts) {
    const alignment = alignOffset(pauses, options.plannedStarts, targetMs, options)
    if (alignment) {
      const cut = chooseNearestCut(pauses, targetMs + alignment.offsetMs, { searchMs: [CUT_OPTIONS.alignmentSnapMs] })
      if (cut) return { ...cut, shiftMs: cut.ms - targetMs }
    }
    return chooseNearestCut(pauses, targetMs, { ...options, lengthWeight: CUT_OPTIONS.fallbackLengthWeight, lengthCapMs: CUT_OPTIONS.fallbackLengthCapMs })
  }
  return chooseNearestCut(pauses, targetMs, options)
}

export function confidentCut(cut: ChosenCut | null): boolean {
  return !!cut && Math.abs(cut.shiftMs) <= CUT_OPTIONS.confidentShiftMs && cut.pauseMs >= CUT_OPTIONS.confidentPauseMs
}

// FNV-1a is a deterministic short change detector, not a security signature.
export function targetsHash(segments: readonly Segment[]): string {
  const text = JSON.stringify(segments.map(s => [s.id, s.quarter, s.firstAyah, s.lastAyah, s.startMs, s.endMs]))
  return shortHash(text)
}
function shortHash(text: string): string {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(16).padStart(8, '0')
}
export const cutsAlgorithm = (): string => `${CUT_OPTIONS.algorithm}-${shortHash(JSON.stringify(CUT_OPTIONS))}`

export type WindowFrame = FramePoint & { offset: number; endOffset: number; dataBytes: number; reservoir: number; seconds: number }
export function windowFrames(bytes: Uint8Array, windowStart: number, stream: CbrStream): WindowFrame[] {
  const checkpoint = cbrCheckpoint(stream, windowStart, bytes)
  if (!checkpoint) return []
  const frames: WindowFrame[] = []
  let at = checkpoint.byte - windowStart, ms = checkpoint.timeMs, rate: number | null = null
  while (at + 4 <= bytes.length) {
    if (String.fromCharCode(...bytes.slice(at, at + 3)) === 'TAG' && bytes.length - at === 128) break
    const frame = parseFrame(bytes, at)
    if (!frame || frame.bitrate !== stream.bitrate || rate !== null && rate !== frame.sampleRate) throw new Error('Not a consistent CBR frame window')
    if (at + frame.bytes > bytes.length) break
    const crc = (bytes[at + 1]! & 1) === 0 ? 2 : 0, mono = (bytes[at + 3]! >> 6) === 3
    const side = frame.version === 1 ? mono ? 17 : 32 : mono ? 9 : 17
    frames.push({ byte: windowStart + at, ms, offset: at, endOffset: at + frame.bytes, dataBytes: frame.bytes - 4 - crc - side, reservoir: frame.version === 1 ? 511 : 255, seconds: frame.seconds })
    rate = frame.sampleRate; ms += frame.seconds * 1000; at += frame.bytes
  }
  return frames
}

// Same worst-case reservoir seeding as SegmentScanner. Both the exclusive end
// and the next segment's earlier start must remain inside the detected pause.
export function frameCut(frames: readonly WindowFrame[], chosenMs: number, targetMs: number, pause: Pause): StoredCut | null {
  const ordered = frames.map((f, i) => ({ f, i })).sort((a, b) => Math.abs(a.f.ms - chosenMs) - Math.abs(b.f.ms - chosenMs) || a.f.byte - b.f.byte)
  for (const { f, i } of ordered) {
    if (f.ms < pause.startMs + CUT_OPTIONS.edgeMs || f.ms > pause.endMs - CUT_OPTIONS.edgeMs) continue
    let start = i, data = 0
    while (start > 0 && data < f.reservoir) data += frames[--start]!.dataBytes
    const lead = frames[start]!
    if (data < f.reservoir || lead.ms < pause.startMs + CUT_OPTIONS.edgeMs) continue
    if (Math.abs(f.ms - targetMs) > CUT_OPTIONS.wideWindowMs) continue
    return { byte: f.byte, ms: f.ms, shiftMs: Math.round((f.ms - targetMs) / CUT_OPTIONS.shiftRoundMs) * CUT_OPTIONS.shiftRoundMs, pauseMs: pause.endMs - pause.startMs, startByte: lead.byte, startMs: lead.ms }
  }
  return null
}

// No runtime timings or frame scan needed. Null at any boundary deliberately
// falls back for the entire surah; do not silently mix verified and raw cuts.
export function cutsPlan(entry: SurahCuts | undefined, sizeBytes: number, etag: string | null, mapVersion: number, source?: { server: string; readId: number }): Segment[] | null {
  if (!entry || !etag || entry.etag !== etag || entry.sizeBytes !== sizeBytes || entry.mapVersion !== mapVersion || source && (entry.server !== source.server || entry.readId !== source.readId) || entry.unresolved || !entry.first || !entry.last || entry.cuts.length !== entry.segments.length - 1 || !entry.segments.length || targetsHash(entry.segments) !== entry.planHash) return null
  const point = (p: FramePoint) => Number.isSafeInteger(p.byte) && p.byte >= 0 && p.byte <= sizeBytes && Number.isFinite(p.ms) && p.ms >= 0
  if (!point(entry.first) || !point(entry.last)) return null
  if (entry.first.ms !== 0 || !entry.segments.every((s, i) => s.id === i && Number.isSafeInteger(s.startMs) && Number.isSafeInteger(s.endMs) && s.endMs > s.startMs && s.durationMs === s.endMs - s.startMs && (i === 0 ? s.startMs === 0 : s.startMs === entry.segments[i - 1]!.endMs))) return null
  const result: Segment[] = []
  for (let i = 0; i < entry.segments.length; i++) {
    const cut = entry.cuts[i - 1], end = i === entry.segments.length - 1 ? entry.last : entry.cuts[i]
    if (i > 0 && !cut || !end) return null
    const start = cut ? { byte: cut.startByte, ms: cut.startMs } : entry.first
    if (!point(start) || !point(end) || end.byte <= start.byte || end.ms <= start.ms || end.byte - start.byte >= AUDIO_LIMIT_BYTES || cut && (!point(cut) || cut.startByte > cut.byte || cut.startMs > cut.ms || end.byte <= cut.byte || end.ms <= cut.ms || Math.abs(cut.shiftMs) > CUT_OPTIONS.wideWindowMs || Math.abs(cut.ms - entry.segments[i]!.startMs) > CUT_OPTIONS.wideWindowMs || cut.shiftMs !== Math.round((cut.ms - entry.segments[i]!.startMs) / CUT_OPTIONS.shiftRoundMs) * CUT_OPTIONS.shiftRoundMs || i > 1 && cut.byte <= entry.cuts[i - 2]!.byte)) return null
    result.push({ ...entry.segments[i]!, startByte: start.byte, endByte: end.byte, decodedDurationMs: Math.round(end.ms - start.ms) })
  }
  return result
}

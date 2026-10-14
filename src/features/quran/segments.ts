import { QURAN_QUARTER_BOUNDARIES, QURAN_QUARTER_MAP_VERSION } from './quarter-boundaries.ts'
import type { Reciter, Surah } from './catalog.ts'

// The engine refuses a clip over 26214400 bytes (25 MiB); stay 1 MiB under it.
export const ENGINE_AUDIO_LIMIT_BYTES = 26214400
export const AUDIO_LIMIT_BYTES = ENGINE_AUDIO_LIMIT_BYTES - 1048576
export const SEGMENT_CACHE_KEY = 'quran.segmentCache'
export const SEGMENT_CACHE_MS = 7 * 86400000
export const SIZE_ERROR = 'مشغّل Claude Code يسمح بملف صوت حتى ٢٥ MiB. تعذّر فحص حجم هذا التسجيل. أعد المحاولة أو اختر قارئًا أو سورة أخرى.'
export const TIMING_ERROR = 'التسجيل يتجاوز حد حجم الصوت في Claude Code، وتوقيتات التقسيم غير مكتملة لهذا التسجيل. اختر قارئًا أو سورة أخرى.'
export const CLIP_ERROR = 'تعذّر تجهيز مقطع صوت سليم تحت حد ٢٥ MiB في Claude Code. أعد المحاولة أو اختر قارئًا أو سورة أخرى.'
export type Segment = { id: number; quarter: number; firstAyah: number; lastAyah: number; startMs: number; endMs: number; durationMs: number; startByte?: number; endByte?: number; decodedDurationMs?: number }
export type Checkpoint = { byte: number; timeMs: number }
export type RecordingPlan = { schemaVersion: 1; mapVersion: number; moshafKey: string; reciterId: number; moshafId: number; reciterName: string; recordingLabel: string; reading: string; timingReadId: number | null; surah: number; surahName: string; ayahCount: number; audioUrl: string; sizeBytes: number; durationMs: number | null; etag: string | null; lastModified: string | null; computedAt: number; updatedAt: number; sourceCheckedAt: number; segments: Segment[]; checkpoints: Checkpoint[] }
export type SegmentCache = Record<string, RecordingPlan>
const record = (v: unknown): Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
export const planKey = (key: string, surah: number) => `${key}:${surah}`
// Byte cuts may finish concurrently. Merge into the newest plan for this exact
// recording, never into objects already exposed to the renderer or host store.
export function sameRecording(a: RecordingPlan | undefined, b: RecordingPlan): boolean {
  return !!a && a.moshafKey === b.moshafKey && a.surah === b.surah && a.audioUrl === b.audioUrl && a.sizeBytes === b.sizeBytes && a.etag === b.etag && a.lastModified === b.lastModified && a.computedAt === b.computedAt && a.sourceCheckedAt === b.sourceCheckedAt
}
export function withSegmentCut(plan: RecordingPlan, index: number, cut: { startByte: number; endByte: number; durationMs: number; checkpoint: Checkpoint }, now: number): RecordingPlan {
  if (!plan.segments[index]) throw new Error(CLIP_ERROR)
  return {
    ...plan, updatedAt: now,
    segments: plan.segments.map((segment, i) => i === index ? { ...segment, startByte: cut.startByte, endByte: cut.endByte, decodedDurationMs: cut.durationMs } : segment),
    checkpoints: [...plan.checkpoints.filter(p => p.byte !== cut.checkpoint.byte), { ...cut.checkpoint }].sort((a, b) => a.byte - b.byte).slice(-64),
  }
}
export function readCache(raw: unknown): SegmentCache {
  const out: SegmentCache = {}
  for (const [key, value] of Object.entries(record(raw))) {
    const p = record(value)
    if (p.schemaVersion !== 1 || p.mapVersion !== QURAN_QUARTER_MAP_VERSION || typeof p.moshafKey !== 'string' || !integer(p.surah) || key !== planKey(p.moshafKey, p.surah) || !integer(p.sizeBytes) || p.sizeBytes === 0 || !integer(p.sourceCheckedAt) || !integer(p.computedAt) || !integer(p.updatedAt) || typeof p.audioUrl !== 'string' || !Array.isArray(p.segments) || !Array.isArray(p.checkpoints) || !integer(p.reciterId) || !integer(p.moshafId) || typeof p.reciterName !== 'string' || typeof p.recordingLabel !== 'string' || typeof p.surahName !== 'string' || p.durationMs !== null && (!integer(p.durationMs) || p.durationMs === 0)) continue
    const segments = p.segments
    const boundaries = QURAN_QUARTER_BOUNDARIES[p.surah]
    if (!boundaries || !segments.every((v, index) => {
      const s = record(v)
      if ((s.startByte === undefined) !== (s.endByte === undefined) || s.startByte !== undefined && (!integer(s.startByte) || !integer(s.endByte) || s.endByte <= s.startByte || s.endByte > (p.sizeBytes as number) || s.endByte - s.startByte >= AUDIO_LIMIT_BYTES || !integer(s.decodedDurationMs) || s.decodedDurationMs === 0)) return false
      return s.id === index && integer(s.quarter) && integer(s.firstAyah) && integer(s.lastAyah) && s.lastAyah >= s.firstAyah && boundaries.some(b => b[0] === s.quarter && s.firstAyah as number >= b[1] && s.lastAyah as number <= b[2]) && integer(s.startMs) && integer(s.endMs) && s.endMs > s.startMs && s.durationMs === s.endMs - s.startMs && (index === 0 ? s.firstAyah === 1 && s.startMs === 0 : s.firstAyah === record(segments[index - 1]).lastAyah as number + 1 && s.startMs === record(segments[index - 1]).endMs)
    }) || !p.checkpoints.every(v => integer(record(v).byte) && (record(v).byte as number) < (p.sizeBytes as number) && typeof record(v).timeMs === 'number' && Number.isFinite(record(v).timeMs) && (record(v).timeMs as number) >= 0 && (p.durationMs === null || (record(v).timeMs as number) <= (p.durationMs as number)))) continue
    if ((p.sizeBytes >= AUDIO_LIMIT_BYTES) !== (p.segments.length > 0) || p.segments.length > 0 && record(p.segments.at(-1)).lastAyah !== boundaries.at(-1)![2]) continue
    out[key] = value as RecordingPlan
  }
  return out
}
export function cachedPlan(raw: unknown, reciter: Reciter, surah: number, url: string, now: number): RecordingPlan | undefined {
  const p = readCache(raw)[planKey(reciter.key, surah)]
  return p && p.audioUrl === url && now >= p.sourceCheckedAt && now - p.sourceCheckedAt < SEGMENT_CACHE_MS ? { ...p, segments: p.segments.map(s => ({ ...s })), checkpoints: p.checkpoints.map(c => ({ ...c })) } : undefined
}
export function trimCache(cache: SegmentCache, plan: RecordingPlan): SegmentCache {
  const entries = Object.entries({ ...cache, [planKey(plan.moshafKey, plan.surah)]: plan }).sort((a, b) => b[1].updatedAt - a[1].updatedAt)
  const out: SegmentCache = {}
  let size = 0
  for (const [key, value] of entries) {
    const length = JSON.stringify(value).length * 3
    if (Object.keys(out).length >= 120 || size + length > 1500000) continue
    out[key] = value; size += length
  }
  return out
}
export function timingRead(value: unknown, server: string): number | null {
  const rows = Array.isArray(value) ? value : record(value).reads
  if (!Array.isArray(rows)) return null
  const matches = rows.map(record).filter(r => integer(r.id) && r.id > 0 && r.folder_url === server)
  return matches.length === 1 ? matches[0]!.id as number : null
}
// The timing API sometimes omits the last ayat of a surah, and some rows have zero length.
// Both are tolerated when every quarter start still has a timing: a missing tail runs to the end of the file,
// and a zero-length ayah that starts a quarter is cut at the next ayah's start (or the previous ayah's end).
// at-Tawbah (9) has no basmala, yet some reads still number its rows from 0, so every row is one ayah early and the
// last ayah looks missing. That is told apart from a genuinely missing tail by the recording length: a shifted surah
// has its last row ending at (or past) the end of the file, a missing tail leaves audio after the last row.
export function shiftedTimings(rows: readonly unknown[], surah: number, count: number, durationMs?: number | null): boolean {
  if (surah !== 9 || typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs <= 0) return false
  let hasZero = false, max = 0, lastEnd = 0
  for (const v of rows) {
    const row = record(v)
    if (!integer(row.ayah) || !integer(row.end_time)) continue
    if (row.ayah === 0) hasZero = true
    if (row.ayah >= max) { max = row.ayah; lastEnd = row.end_time }
  }
  return hasZero && max === count - 1 && lastEnd >= durationMs - Math.max(3000, durationMs * 0.002)
}
export function timedSegments(value: unknown, surah: number, sizeBytes: number, fileDurationMs?: number | null): Segment[] {
  const boundaries = QURAN_QUARTER_BOUNDARIES[surah]
  const given = Array.isArray(value) ? value : record(value).ayat_timing
  if (!boundaries || !Array.isArray(given)) throw new Error(TIMING_ERROR)
  const count = boundaries.at(-1)![2]
  // Renumbered into new objects: the input is frozen.
  const rows = shiftedTimings(given, surah, count, fileDurationMs) ? given.map(v => { const row = record(v); return integer(row.ayah) ? { ...row, ayah: row.ayah + 1 } : row }) : given
  const times = new Map<number, { start: number; end: number }>()
  let known = 0
  for (const v of rows) {
    const row = record(v)
    if (!integer(row.ayah) || row.ayah === 0) continue
    if (row.ayah > count || times.has(row.ayah) || !integer(row.start_time) || !integer(row.end_time) || row.end_time < row.start_time) throw new Error(TIMING_ERROR)
    times.set(row.ayah, { start: row.start_time, end: row.end_time })
    known = Math.max(known, row.ayah)
  }
  // Only a missing tail is tolerated, and never a quarter start.
  if (known === 0 || times.size !== known || boundaries.some(([, first]) => first > known)) throw new Error(TIMING_ERROR)
  for (let a = 2; a <= known; a++) if (times.get(a)!.start < times.get(a - 1)!.end || times.get(a)!.start < times.get(a - 1)!.start) throw new Error(TIMING_ERROR)
  const total = times.get(known)!.end
  const maxMs = total * AUDIO_LIMIT_BYTES * 0.95 / sizeBytes
  // Where the cut before ayah `a` falls; undefined when `a` lies in the missing tail.
  const cut = (a: number): number | undefined => {
    const t = times.get(a)
    if (!t) return undefined
    if (t.end > t.start) return t.start
    return times.get(a + 1)?.start ?? times.get(a - 1)?.end ?? t.start
  }
  const result: Segment[] = []
  for (const [quarter, first, last] of boundaries) {
    let from = first
    for (let to = first; to <= last; to++) {
      const start = from === 1 ? 0 : cut(from)!
      const end = to < count ? cut(to + 1) : total
      if (end === undefined) continue
      const nextEnd = to + 1 < count ? cut(to + 2) ?? total : total
      if (to !== last && nextEnd - start <= maxMs) continue
      if (end <= start) throw new Error(TIMING_ERROR)
      if (end - start > maxMs && from === to) throw new Error(CLIP_ERROR)
      result.push({ id: result.length, quarter, firstAyah: from, lastAyah: to, startMs: start, endMs: end, durationMs: end - start })
      from = to + 1
    }
  }
  return result
}
export function makePlan(reciter: Reciter, surah: Surah, url: string, sizeBytes: number, now: number, headers: Record<string, string>, durationMs: number | null, readId: number | null, segments: Segment[], previous?: RecordingPlan): RecordingPlan {
  const [reciterId, moshafId] = reciter.key.split(':').map(Number)
  return { schemaVersion: 1, mapVersion: QURAN_QUARTER_MAP_VERSION, moshafKey: reciter.key, reciterId: reciterId!, moshafId: moshafId!, reciterName: reciter.name, recordingLabel: reciter.label, reading: 'حفص عن عاصم', timingReadId: readId, surah: surah.id, surahName: surah.name, ayahCount: QURAN_QUARTER_BOUNDARIES[surah.id]!.at(-1)![2], audioUrl: url, sizeBytes, durationMs, etag: headers.etag ?? null, lastModified: headers['last-modified'] ?? null, computedAt: previous?.computedAt ?? now, updatedAt: now, sourceCheckedAt: now, segments, checkpoints: [] }
}
export function fileSize(headers: Record<string, string>): number | null {
  const value = Number(headers['content-length'])
  return Number.isSafeInteger(value) && value > 0 ? value : null
}
export function lowerHeaders(headers: Readonly<Record<string, string>>): Record<string, string> { return Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])) }
export function rangeHeader(text: string): { start: number; end: number; total: number; etag: string | null; lastModified: string | null } | null {
  const blocks = text.trim().split(/\r?\n\r?\n/)
  const last = blocks.at(-1) ?? ''
  const match = /^content-range:\s*bytes\s+(\d+)-(\d+)\/(\d+)\s*$/im.exec(last)
  if (!/^HTTP\/\S+\s+206\b/m.test(last) || !match) return null
  const [start, end, total] = match.slice(1).map(Number)
  if (![start, end, total].every(integer) || start! > end! || end! >= total!) return null
  return { start: start!, end: end!, total: total!, etag: /^etag:\s*(.+)$/im.exec(last)?.[1]?.trim() ?? null, lastModified: /^last-modified:\s*(.+)$/im.exec(last)?.[1]?.trim() ?? null }
}

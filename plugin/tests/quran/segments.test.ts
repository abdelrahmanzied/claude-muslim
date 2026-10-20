import { expect, test } from 'claude-code/testing'
import { AUDIO_LIMIT_BYTES, CLIP_ERROR, TIMING_ERROR, cachedPlan, fileSize, makePlan, rangeHeader, readCache, sameRecording, withSegmentCut, timedSegments, timingRead, trimCache, SEGMENT_CACHE_MS } from '../../src/features/quran/segments.ts'
import { QURAN_QUARTER_BOUNDARIES } from '../../src/features/quran/quarter-boundaries.ts'
import { fixtureCatalog } from './fixtures/catalog.ts'

const reciter = fixtureCatalog.reciters[0]!
const surah = fixtureCatalog.surahs[1]!
const times = () => Array.from({ length: 286 }, (_, i) => ({ ayah: i + 1, start_time: i * 1000 + 250, end_time: (i + 1) * 1000 }))
const plan = (size = AUDIO_LIMIT_BYTES * 2) => makePlan(reciter, surah, reciter.server + '002.mp3', size, 100000, { etag: 'fixture' }, 286000, 112, size >= AUDIO_LIMIT_BYTES ? timedSegments(times(), 2, size) : [])

test('shipped quarter intersections cover all 114 surahs without gaps or duplicated ayahs', () => {
  expect(Object.keys(QURAN_QUARTER_BOUNDARIES)).toHaveLength(114)
  const quarters = new Set<number>()
  let ayahs = 0, intersections = 0
  for (const rows of Object.values(QURAN_QUARTER_BOUNDARIES)) {
    let last = 0
    for (const [quarter, first, end] of rows) {
      expect(first).toBe(last + 1)
      expect(end >= first).toBe(true)
      quarters.add(quarter); ayahs += end - first + 1; intersections++; last = end
    }
  }
  expect(quarters.size).toBe(240)
  expect(ayahs).toBe(6236)
  expect(intersections).toBe(313)
})
test('timing IDs resolve only one exact recording server, never the reciter name', () => {
  const reads = [{ id: 112, folder_url: reciter.server }, { id: 118, folder_url: reciter.server + 'other/' }]
  expect(timingRead(reads, reciter.server)).toBe(112)
  expect(timingRead({ reads }, reciter.server)).toBe(112)
  expect(timingRead([...reads, reads[0]], reciter.server)).toBe(null)
  expect(timingRead(reads, 'https://wrong.example/')).toBe(null)
})
test('segments retain the introduction, cover every ayah and stop at the selected surah', () => {
  const segments = timedSegments([{ ayah: 0, start_time: 0, end_time: 250 }, ...times()], 2, AUDIO_LIMIT_BYTES * 2)
  expect(segments).toHaveLength(20)
  expect(segments[0]).toEqual({ id: 0, quarter: 1, firstAyah: 1, lastAyah: 25, startMs: 0, endMs: 25250, durationMs: 25250 })
  expect(segments.at(-1)?.lastAyah).toBe(286)
  expect(segments.at(-1)?.endMs).toBe(286000)
  for (let i = 1; i < segments.length; i++) {
    expect(segments[i]!.startMs).toBe(segments[i - 1]!.endMs)
    expect(segments[i]!.firstAyah).toBe(segments[i - 1]!.lastAyah + 1)
  }
})
test('missing, duplicate, overlapping or reversed timings never become guessed boundaries', () => {
  for (const bad of [times().slice(1), [...times(), times()[0]], times().map(r => r.ayah === 2 ? { ...r, start_time: 999 } : r), times().map(r => r.ayah === 2 ? { ...r, end_time: 1 } : r)]) {
    expect(() => timedSegments(bad, 2, AUDIO_LIMIT_BYTES * 2)).toThrow(TIMING_ERROR)
  }
})
test('a missing last ayah runs the last segment to the end; a missing quarter start still fails', () => {
  const segments = timedSegments(times().slice(0, 285), 2, AUDIO_LIMIT_BYTES * 2)
  expect(segments).toHaveLength(20)
  expect(segments.at(-1)).toEqual({ id: 19, quarter: 20, firstAyah: 283, lastAyah: 286, startMs: 282250, endMs: 285000, durationMs: 2750 })
  expect(timedSegments(times().slice(0, 284), 2, AUDIO_LIMIT_BYTES * 2).at(-1)?.lastAyah).toBe(286)
  expect(() => timedSegments(times().slice(0, 282), 2, AUDIO_LIMIT_BYTES * 2)).toThrow(TIMING_ERROR)
  expect(() => timedSegments(times().filter(r => r.ayah !== 26), 2, AUDIO_LIMIT_BYTES * 2)).toThrow(TIMING_ERROR)
  expect(() => timedSegments(times().filter(r => r.ayah < 11 || r.ayah > 20), 4, AUDIO_LIMIT_BYTES * 2)).toThrow(TIMING_ERROR)
})
test('a zero-length ayah is tolerated, and cut at the next ayah when it starts a quarter', () => {
  const zero = (ayah: number) => times().map(r => r.ayah === ayah ? { ...r, start_time: r.start_time, end_time: r.start_time } : r)
  const mid = timedSegments(zero(149), 2, AUDIO_LIMIT_BYTES * 2)
  expect(mid).toHaveLength(20)
  expect(mid.map(s => s.startMs)).toEqual(timedSegments(times(), 2, AUDIO_LIMIT_BYTES * 2).map(s => s.startMs))
  const rows = times().map(r => r.ayah === 26 ? { ...r, end_time: r.start_time } : r.ayah === 27 ? { ...r, start_time: r.start_time + 100 } : r)
  const start = timedSegments(rows, 2, AUDIO_LIMIT_BYTES * 2)
  expect(start[1]!.firstAyah).toBe(26)
  expect(start[1]!.startMs).toBe(start[0]!.endMs)
  expect(start[1]!.startMs).toBe(26350)
})
test('estimated oversize quarters subdivide at ayah boundaries; a single oversize ayah fails safely', () => {
  const segments = timedSegments(times(), 2, AUDIO_LIMIT_BYTES * 100)
  expect(segments.length > 20).toBe(true)
  expect(segments.every(s => s.lastAyah >= s.firstAyah && s.durationMs <= 2750)).toBe(true)
  expect(() => timedSegments(times(), 2, AUDIO_LIMIT_BYTES * 1000)).toThrow(CLIP_ERROR)
})
test('local cache holds metadata only and expires or rejects a different recording URL', () => {
  const p = plan(), raw = { '10:20:2': p }
  expect(cachedPlan(raw, reciter, 2, p.audioUrl, p.sourceCheckedAt + 1)).toEqual(p)
  expect(cachedPlan(raw, reciter, 2, p.audioUrl, p.sourceCheckedAt + SEGMENT_CACHE_MS)).toBeUndefined()
  expect(cachedPlan(raw, reciter, 2, 'https://changed.example/002.mp3', 100001)).toBeUndefined()
  expect(cachedPlan(raw, reciter, 2, p.audioUrl, 99999)).toBeUndefined()
  expect(readCache({ 'wrong-key': p })).toEqual({})
  expect(readCache({ '10:20:2': { ...p, mapVersion: 999 } })).toEqual({})
  expect(readCache({ '10:20:2': { ...p, segments: p.segments.slice(1) } })).toEqual({})
  expect(readCache({ '10:20:2': { ...p, checkpoints: [{ byte: p.sizeBytes, timeMs: 100 }] } })).toEqual({})
  const invalid = { ...p, segments: p.segments.map((s, i) => i === 0 ? { ...s, startByte: 0, endByte: AUDIO_LIMIT_BYTES, decodedDurationMs: 1000 } : s) }
  expect(readCache({ '10:20:2': invalid })).toEqual({})
  const small = plan(AUDIO_LIMIT_BYTES - 1)
  expect(readCache({ '10:20:2': small })['10:20:2']?.segments).toEqual([])
})
test('metadata trim retains newest plans and stays bounded instead of filling the shared store', () => {
  const cache = Object.fromEntries(Array.from({ length: 130 }, (_, i) => [`${i}:20:2`, { ...plan(), moshafKey: `${i}:20`, updatedAt: i }]))
  const trimmed = trimCache(cache, plan())
  expect(Object.keys(trimmed)).toHaveLength(120)
  expect(trimmed['10:20:2']?.updatedAt).toBe(100000)
  expect(trimmed['0:20:2']).toBeUndefined()
  expect(JSON.stringify(trimmed).length * 3 < 1500000).toBe(true)
})
test('frozen store data is copied before attaching verified byte cuts and checkpoints', () => {
  const p = plan()
  p.segments.forEach(Object.freeze)
  Object.freeze(p.segments); Object.freeze(p.checkpoints); Object.freeze(p)
  const copied = cachedPlan(Object.freeze({ '10:20:2': p }), reciter, 2, p.audioUrl, 100001)!
  copied.segments[0]!.startByte = 0
  copied.segments[0]!.endByte = 1000
  copied.checkpoints.push({ byte: 10, timeMs: 1 })
  copied.updatedAt = 100002
  expect(p.segments[0]!.startByte).toBeUndefined()
  expect(p.checkpoints).toEqual([])
  expect(p.updatedAt).toBe(100000)
})
test('size and range metadata reject ignored ranges and use the final redirect response', () => {
  expect(fileSize({ 'content-length': '25165824' })).toBe(AUDIO_LIMIT_BYTES)
  for (const value of ['', '-1', 'abc', '0', '1.5']) expect(fileSize({ 'content-length': value })).toBe(null)
  expect(rangeHeader('HTTP/2 302\r\nlocation: /new\r\n\r\nHTTP/2 206\r\nContent-Range: bytes 10-19/100\r\nETag: abc\r\n\r\n')).toEqual({ start: 10, end: 19, total: 100, etag: 'abc', lastModified: null })
  expect(rangeHeader('HTTP/2 200\r\nContent-Range: bytes 0-99/100\r\n')).toBe(null)
  expect(rangeHeader('HTTP/2 206\r\nContent-Range: bytes 20-10/100\r\n')).toBe(null)
})
test('immutable extraction merges concurrent cuts into a frozen recording without losing checkpoints', () => {
  const p = plan()
  p.segments.forEach(Object.freeze)
  Object.freeze(p.segments); Object.freeze(p.checkpoints); Object.freeze(p)
  const first = withSegmentCut(p, 0, { startByte: 0, endByte: 1000, durationMs: 100, checkpoint: { byte: 0, timeMs: 0 } }, 100001)
  Object.freeze(first.segments); Object.freeze(first.checkpoints); Object.freeze(first)
  const next = withSegmentCut(first, 1, { startByte: 900, endByte: 1900, durationMs: 100, checkpoint: { byte: 800, timeMs: 80 } }, 100002)
  expect(next.segments[0]!.startByte).toBe(0)
  expect(next.segments[1]!.startByte).toBe(900)
  expect(next.checkpoints).toEqual([{ byte: 0, timeMs: 0 }, { byte: 800, timeMs: 80 }])
  expect(p.segments[0]!.startByte).toBeUndefined()
  expect(first.segments[1]!.startByte).toBeUndefined()
  expect(first.checkpoints).toHaveLength(1)
  expect(sameRecording(next, p)).toBe(true)
  for (const change of [{ surah: 3 }, { moshafKey: '10:21' }, { etag: 'changed' }, { computedAt: 100003 }, { sourceCheckedAt: 100003 }, { sizeBytes: p.sizeBytes + 1 }, { audioUrl: p.audioUrl + '?changed' }]) expect(sameRecording({ ...p, ...change }, p)).toBe(false)
})
// at-Tawbah has no basmala; some reads number its rows 0..128, which shifts every ayah by one.
const tawbah = (fromZero: boolean, n = 129) => Array.from({ length: n }, (_, i) => ({ ayah: fromZero ? i : i + 1, start_time: i * 1000 + 250, end_time: (i + 1) * 1000 }))
test('a shifted at-Tawbah is renumbered when the last row reaches the end of the file', () => {
  const rows = tawbah(true)
  const frozen = Object.freeze(rows.map(r => Object.freeze({ ...r })))
  const big = AUDIO_LIMIT_BYTES * 2
  const shifted = timedSegments(frozen, 9, big, 129000)
  const proper = timedSegments(tawbah(false), 9, big)
  expect(shifted).toEqual(proper)
  expect(shifted.at(-1)?.lastAyah).toBe(129)
  expect(shifted.at(-1)?.endMs).toBe(129000)
  expect(timedSegments(frozen, 9, big, 127000).at(-1)?.endMs).toBe(129000)
})
test('a missing tail is kept when the file runs on past the last row, or its length is unknown', () => {
  const rows = tawbah(true)
  const big = AUDIO_LIMIT_BYTES * 2
  const shifted = timedSegments(rows, 9, big, 129000)
  const kept = timedSegments(rows, 9, big)
  expect(kept.at(-1)?.lastAyah).toBe(129)
  expect(kept.map(s => s.startMs)).not.toEqual(shifted.map(s => s.startMs))
  for (const duration of [undefined, null, 129000 + 26000, 0]) expect(timedSegments(rows, 9, big, duration)).toEqual(kept)
  // Another surah never takes the shifted path.
  expect(timedSegments([{ ayah: 0, start_time: 0, end_time: 250 }, ...times().slice(0, 285)], 2, big, 285000).at(-1)?.endMs).toBe(285000)
})

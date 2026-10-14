import { expect, test } from 'claude-code/testing'
import { CUT_OPTIONS, alignOffset, chooseCut, confidentCut, cutPauses, cutsPlan, findPauses, frameCut, targetsHash, windowFrames, type SurahCuts } from '../../src/features/quran/cuts.ts'
import { QURAN_CUTS, QURAN_CUTS_VERSION, QURAN_CUTS_MAP_VERSION } from '../../src/features/quran/reciter-cuts.ts'
import { QURAN_SUPPORT } from '../../src/features/quran/reciter-support.ts'
import { QURAN_QUARTER_MAP_VERSION, QURAN_QUARTER_BOUNDARIES } from '../../src/features/quran/quarter-boundaries.ts'
import { AUDIO_LIMIT_BYTES, type Segment } from '../../src/features/quran/segments.ts'

function pcm(noise = 0, int = false): Int16Array | Float32Array {
  const samples = new Float32Array(3 * 16000)
  let seed = 42
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    samples[i] = (seed / 4294967296 * 2 - 1) * noise + (i < 16000 || i >= 32000 ? 0.7 * Math.sin(2 * Math.PI * 400 * i / 16000) : 0)
  }
  return int ? Int16Array.from(samples, n => Math.round(n * 32767)) : samples
}
test('adaptive pauses find tone/silence/tone on float and signed 16-bit PCM', () => {
  for (const int of [false, true]) expect(findPauses(pcm(0, int), 16000)).toEqual([{ startMs: 1000, endMs: 2000 }])
})
test('quiet and loud recording noise floors use relative energy instead of fixed dB', () => {
  for (const noise of [0.001, 0.07]) for (const int of [false, true]) expect(findPauses(pcm(noise, int), 16000)).toEqual([{ startMs: 1000, endMs: 2000 }])
  const quiet = Float32Array.from(pcm(0.001), n => n * 0.01)
  expect(findPauses(quiet, 16000)).toEqual([{ startMs: 1000, endMs: 2000 }])
})
test('constant sound, all silence, short gaps, invalid PCM and edge silence are not credible pauses', () => {
  expect(findPauses(new Float32Array(16000).fill(0.2), 16000)).toEqual([])
  expect(findPauses(new Int16Array(16000), 16000)).toEqual([])
  expect(findPauses(new Float32Array(0), 16000)).toEqual([])
  expect(findPauses(pcm(), 0)).toEqual([])
  const samples = pcm() as Float32Array
  samples.fill(0, 0, 3200); samples.fill(0, 44800)
  expect(findPauses(samples, 16000)).toEqual([{ startMs: 1000, endMs: 2000 }])
  expect(findPauses(pcm(), 16000, { minPauseMs: 1100 })).toEqual([])
})
test('chooseCut weights pause length but keeps the first credible nearby search tier', () => {
  const near = { startMs: 900, endMs: 1100 }, long = { startMs: 1050, endMs: 2050 }
  expect(chooseCut([near, long], 1000)).toEqual({ ms: 1550, shiftMs: 550, pauseMs: 1000 })
  expect(chooseCut([near, { startMs: 2900, endMs: 4900 }], 1000)?.ms).toBe(1000)
  expect(chooseCut([long, near], 1000)).toEqual(chooseCut([near, long], 1000))
})
test('chooseCut widens in steps, supports the one wider window, and returns null', () => {
  expect(chooseCut([{ startMs: 6700, endMs: 7300 }], 1000)).toEqual({ ms: 7000, shiftMs: 6000, pauseMs: 600 })
  const far = [{ startMs: 29800, endMs: 30200 }]
  expect(chooseCut(far, 1000)).toBe(null)
  expect(chooseCut(far, 1000, { searchMs: [...CUT_OPTIONS.searchMs, CUT_OPTIONS.wideWindowMs] })?.shiftMs).toBe(29000)
  expect(chooseCut([], 1000)).toBe(null)
  expect(chooseCut([{ startMs: 1000, endMs: 1100 }], 1000)).toBe(null)
})
test('local alignment recovers a shared minus-nine-second step over four PCM boundaries despite a nearby waqf', () => {
  const starts = [18000, 29500, 42700, 56800], pauses = starts.map(ms => ({ startMs: ms - 9700, endMs: ms - 8300 }))
  pauses.push({ startMs: 44200, endMs: 45200 }) // in-ayah waqf +2s from the target
  const samples = new Float32Array(70000 * 16)
  for (let i = 0; i < samples.length; i++) samples[i] = 0.6 * Math.sin(2 * Math.PI * 300 * i / 16000)
  for (const p of pauses) samples.fill(0, p.startMs * 16, p.endMs * 16)
  const detected = findPauses(samples, 16000), target = starts[2]!
  const offset = alignOffset(detected, starts, target)!
  expect(Math.abs(offset.offsetMs + 9000) < 100).toBe(true)
  const cut = chooseCut(detected, target, { plannedStarts: starts })!
  expect(Math.abs(cut.shiftMs + 9000) < 100).toBe(true)
  expect(cut.pauseMs).toBe(1400)
})
test('local alignment rejects competing offset peaks and too few boundaries', () => {
  const starts = [20000, 33000, 47000, 58000]
  const pauses = starts.flatMap(ms => [-9000, 9000].map(offset => ({ startMs: ms + offset - 600, endMs: ms + offset + 600 })))
  expect(alignOffset(pauses, starts, 33000)).toBe(null)
  expect(alignOffset(pauses, [33000], 33000)).toBe(null)
  expect(chooseCut([{ startMs: 32200, endMs: 33800 }], 33000, { plannedStarts: [33000] })?.shiftMs).toBe(0)
})
test('a confirmed local offset carries a slow ramp beyond the initial twelve-second search', () => {
  const starts = [30000, 43000, 59000, 78000], pauses = starts.map(ms => ({ startMs: ms + 27200, endMs: ms + 28800 }))
  expect(alignOffset(pauses, starts, 59000, { priorOffsetMs: 22000 })?.offsetMs).toBe(28000)
  expect(chooseCut(pauses, 59000, { plannedStarts: starts, priorOffsetMs: 22000 })?.shiftMs).toBe(28000)
})
test('adaptive fallback preserves original pause intervals when they are available', () => {
  for (const noise of [0, 0.001, 0.07]) expect(cutPauses(pcm(noise), 16000)).toEqual(cutPauses(pcm(noise), 16000, 'before'))
  expect(chooseCut([{ startMs: 9900, endMs: 10100 }, { startMs: 10400, endMs: 11800 }], 10000, { plannedStarts: [10000] })?.pauseMs).toBe(1400)
})
test('accurate boundaries retain zero alignment and the inexpensive confident path', () => {
  const starts = [10000, 21000, 37000, 51000]
  const pauses = starts.map(ms => ({ startMs: ms - 700, endMs: ms + 700 }))
  expect(alignOffset(pauses, starts, 37000)?.offsetMs).toBe(0)
  expect(chooseCut(pauses, 37000, { plannedStarts: starts })?.shiftMs).toBe(0)
  expect(confidentCut({ ms: 37000, shiftMs: 0, pauseMs: 1400 })).toBe(true)
  expect(confidentCut({ ms: 39000, shiftMs: 2000, pauseMs: 1400 })).toBe(false)
  expect(confidentCut({ ms: 37000, shiftMs: 0, pauseMs: 300 })).toBe(false)
})
function fakeFrames(header = [255, 251, 148, 0], frameBytes = 384, count = 1000) {
  const bytes = new Uint8Array(frameBytes * count)
  for (let at = 0; at < bytes.length; at += frameBytes) bytes.set(header, at)
  return bytes
}
test('window byte mapping aligns a partial range and retains the same MPEG-1 reservoir as playback', () => {
  const bytes = fakeFrames(), at = 71
  const frames = windowFrames(bytes.slice(at), at, { audioStart: 0, bitrate: 128000 })
  expect(frames[0]!.byte).toBe(384)
  expect(frames[0]!.ms).toBe(24)
  const cut = frameCut(frames, 2400, 2200, { startMs: 2100, endMs: 2700 })!
  expect(cut.byte).toBe(100 * 384)
  expect(cut.ms).toBe(2400)
  expect(cut.startByte).toBe(98 * 384)
  expect(cut.startMs).toBe(2352)
  expect(cut.shiftMs).toBe(200)
  expect(frameCut(frames, 2400, 2200, { startMs: 2370, endMs: 2430 })).toBe(null)
  expect(windowFrames(new Uint8Array(100), 0, { audioStart: 0, bitrate: 128000 })).toEqual([])
  const vbr = bytes.slice(); vbr[384 * 10 + 2] = 176
  expect(() => windowFrames(vbr, 0, { audioStart: 0, bitrate: 128000 })).toThrow('Not a consistent CBR frame window')
})
test('low-bitrate MPEG-2 needs 51 frames to seed its 255-byte reservoir', () => {
  const frames = windowFrames(fakeFrames([255, 243, 16, 0], 26), 0, { audioStart: 0, bitrate: 8000 })
  const chosen = frames[400]!.ms
  const cut = frameCut(frames, chosen, chosen, { startMs: frames[300]!.ms, endMs: frames[500]!.ms })!
  expect(cut.byte).toBe(400 * 26)
  expect(cut.startByte).toBe(349 * 26)
})
const segment = (id: number, startMs: number, endMs: number): Segment => ({ id, quarter: id + 1, firstAyah: id + 1, lastAyah: id + 1, startMs, endMs, durationMs: endMs - startMs })
function entry(): SurahCuts {
  const segments = [segment(0, 0, 10000), segment(1, 10000, 20000)]
  return { sizeBytes: 40000000, etag: '"test"', readId: 112, server: 'https://example.test/', mapVersion: 1, planHash: targetsHash(segments), segments, first: { byte: 0, ms: 0 }, last: { byte: 300000, ms: 20000 }, cuts: [{ byte: 150000, ms: 10100, shiftMs: 100, pauseMs: 500, startByte: 149000, startMs: 10050 }] }
}
test('runtime helper returns playable Segment fields without mutating planned labels or times', () => {
  const stored = entry(), before = JSON.stringify(stored)
  const result = cutsPlan(stored, stored.sizeBytes, stored.etag, 1)!
  expect(result[0]).toEqual({ ...stored.segments[0], startByte: 0, endByte: 150000, decodedDurationMs: 10100 })
  expect(result[1]).toEqual({ ...stored.segments[1], startByte: 149000, endByte: 300000, decodedDurationMs: 9950 })
  expect(JSON.stringify(stored)).toBe(before)
})
test('stale source, map, missing validators, unresolved and over-limit cuts fall back', () => {
  const e = entry()
  expect(cutsPlan(e, e.sizeBytes + 1, e.etag, 1)).toBe(null)
  expect(cutsPlan(e, e.sizeBytes, '"changed"', 1)).toBe(null)
  expect(cutsPlan(e, e.sizeBytes, e.etag, 2)).toBe(null)
  expect(cutsPlan({ ...e, etag: null }, e.sizeBytes, null, 1)).toBe(null)
  expect(cutsPlan(e, e.sizeBytes, e.etag, 1, { server: 'changed', readId: 112 })).toBe(null)
  expect(cutsPlan(e, e.sizeBytes, e.etag, 1, { server: e.server, readId: 113 })).toBe(null)
  expect(cutsPlan({ ...e, cuts: [null] }, e.sizeBytes, e.etag, 1)).toBe(null)
  expect(cutsPlan({ ...e, unresolved: 'non-cbr' }, e.sizeBytes, e.etag, 1)).toBe(null)
  expect(cutsPlan({ ...e, planHash: '00000000' }, e.sizeBytes, e.etag, 1)).toBe(null)
  expect(cutsPlan({ ...e, last: { byte: 40000001, ms: 20000 } }, e.sizeBytes, e.etag, 1)).toBe(null)
  expect(cutsPlan({ ...e, last: { byte: 30000000, ms: 20000 } }, e.sizeBytes, e.etag, 1)).toBe(null)
  expect(cutsPlan(undefined, e.sizeBytes, e.etag, 1)).toBe(null)
})
test('planned target hash responds to time, labels and segment subdivisions', () => {
  const s = entry().segments
  expect(targetsHash(s)).toBe(targetsHash(s.map(v => ({ ...v }))))
  expect(targetsHash(s) === targetsHash([{ ...s[0]!, endMs: 10001 }, s[1]!])).toBe(false)
  expect(targetsHash(s) === targetsHash([s[0]!, { ...s[1]!, quarter: 3 }])).toBe(false)
})
test('shipped cuts catalog is valid offline, including the deliberately empty placeholder', () => {
  expect(QURAN_CUTS_VERSION).toBe(1)
  expect(QURAN_CUTS_MAP_VERSION).toBe(QURAN_QUARTER_MAP_VERSION)
  for (const [key, surahs] of Object.entries(QURAN_CUTS)) {
    expect(/^[1-9]\d*:[1-9]\d*$/.test(key)).toBe(true)
    const support = QURAN_SUPPORT[key]!
    expect(!!support).toBe(true)
    for (const [text, e] of Object.entries(surahs)) {
      const surah = Number(text)
      expect(Number.isInteger(surah) && surah >= 1 && surah <= 114).toBe(true)
      expect(!!support.split[surah]).toBe(true)
      expect(e!.sizeBytes >= AUDIO_LIMIT_BYTES && Number.isSafeInteger(e!.sizeBytes)).toBe(true)
      expect(e!.readId).toBe(support.timingReadId)
      expect(e!.server).toBe(support.server)
      expect(e!.mapVersion).toBe(QURAN_QUARTER_MAP_VERSION)
      expect(e!.planHash).toBe(targetsHash(e!.segments))
      expect(e!.cuts.length).toBe(Math.max(0, e!.segments.length - 1))
      let byte = e!.first?.byte ?? -1, ms = e!.first?.ms ?? -1
      for (const [i, cut] of e!.cuts.entries()) {
        if (!cut) continue
        expect(Number.isSafeInteger(cut.byte) && cut.byte > byte && cut.byte < e!.sizeBytes).toBe(true)
        expect(cut.ms > ms && Number.isFinite(cut.ms)).toBe(true)
        expect(cut.startByte >= 0 && cut.startByte <= cut.byte && cut.startMs <= cut.ms).toBe(true)
        expect(Math.abs(cut.shiftMs) <= CUT_OPTIONS.wideWindowMs && cut.shiftMs % CUT_OPTIONS.shiftRoundMs === 0).toBe(true)
        expect(cut.shiftMs).toBe(Math.round((cut.ms - e!.segments[i + 1]!.startMs) / CUT_OPTIONS.shiftRoundMs) * CUT_OPTIONS.shiftRoundMs)
        byte = cut.byte; ms = cut.ms
      }
      for (const [i, s] of e!.segments.entries()) {
        expect(s.id).toBe(i)
        expect(QURAN_QUARTER_BOUNDARIES[surah]!.some(b => b[0] === s.quarter && s.firstAyah >= b[1] && s.lastAyah <= b[2])).toBe(true)
      }
      if (e!.first) expect(e!.first.byte >= 0 && e!.first.byte < e!.sizeBytes).toBe(true)
      if (e!.last) expect(e!.last.byte > byte && e!.last.byte <= e!.sizeBytes && e!.last.ms > ms).toBe(true)
      if (!e!.unresolved && e!.etag && e!.cuts.every(c => c !== null)) expect(cutsPlan(e, e!.sizeBytes, e!.etag, QURAN_QUARTER_MAP_VERSION) !== null).toBe(true)
    }
  }
})

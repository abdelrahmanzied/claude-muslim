import { expect, test } from 'claude-code/testing'
import { AUDIO_LIMIT_BYTES } from '../../src/features/quran/segments.ts'
import { classifyRecording, classifySurah, timingRead, type SurahProbe } from '../../src/features/quran/support.ts'
import { QURAN_SUPPORT, QURAN_SUPPORT_VERSION } from '../../src/features/quran/reciter-support.ts'
import { fixtureCatalog } from './fixtures/catalog.ts'

// Numeric timing fixtures only; no religious text is generated.
const times = (count = 7) => Array.from({ length: count }, (_, i) => ({ ayah: i + 1, start_time: i * 1000, end_time: (i + 1) * 1000 }))
const big = AUDIO_LIMIT_BYTES * 2

test('a reachable file under the limit plays whole without timings', () => {
  expect(classifySurah(1, { sizeBytes: AUDIO_LIMIT_BYTES - 1 }, null)).toEqual({ kind: 'whole' })
})
test('failed or invalid HEAD sizes are unreachable before timing classification', () => {
  for (const sizeBytes of [null, 0, -1, 1.5, NaN]) expect(classifySurah(1, { sizeBytes }, null)).toEqual({ kind: 'unavailable', reason: 'unreachable' })
})
test('large recordings without an exact timing read are unavailable', () => {
  const reciter = fixtureCatalog.reciters[0]!
  expect(timingRead({ reads: [{ id: 112, folder_url: reciter.server + 'other/' }] }, reciter.server)).toBe(null)
  expect(timingRead({ reads: [{ id: 112, folder_url: reciter.server }] }, reciter.server)).toBe(112)
  for (const sizeBytes of [AUDIO_LIMIT_BYTES, big]) expect(classifySurah(1, { sizeBytes, timings: times() }, null)).toEqual({ kind: 'unavailable', reason: 'no-timing' })
})
test('missing or invalid timing JSON is a timing error', () => {
  for (const timings of [undefined, [], { ayat_timing: [] }, times().slice(1)]) expect(classifySurah(1, { sizeBytes: big, timings }, 112)).toEqual({ kind: 'unavailable', reason: 'timing-error' })
})
test('the existing time ratio check rejects an oversized single ayah or introduction', () => {
  const timings = times().map(row => ({ ...row, start_time: row.ayah === 1 ? 0 : row.start_time + 100000, end_time: row.end_time + 100000 }))
  expect(classifySurah(1, { sizeBytes: big, timings }, 112)).toEqual({ kind: 'unavailable', reason: 'clip-too-big' })
})
test('valid large surahs split, including the exact limit and tolerated missing tail', () => {
  for (const sizeBytes of [AUDIO_LIMIT_BYTES, big]) expect(classifySurah(1, { sizeBytes, timings: { ayat_timing: times() }, durationMs: 7000 }, 112)).toEqual({ kind: 'split', sizeBytes })
  expect(classifySurah(2, { sizeBytes: big, timings: times(285) }, 112)).toEqual({ kind: 'split', sizeBytes: big })
  const shifted = times(129).map(row => Object.freeze({ ...row, ayah: row.ayah - 1 }))
  expect(classifySurah(9, { sizeBytes: big, timings: Object.freeze(shifted), durationMs: 129000 }, 112)).toEqual({ kind: 'split', sizeBytes: big })
})
test('recording classification keeps whole surahs implicit and never accepts incomplete probes', () => {
  const reciter = fixtureCatalog.reciters[0]!
  const probes: Record<number, SurahProbe> = Object.fromEntries(Array.from({ length: 114 }, (_, i) => [i + 1, { sizeBytes: 1000 }]))
  probes[1] = { sizeBytes: big, timings: times() }
  probes[2] = { sizeBytes: null }
  expect(classifyRecording(reciter, 112, probes)).toEqual({ name: reciter.name, server: reciter.server, timingReadId: 112, split: { 1: big }, unavailable: { 2: 'unreachable' } })
  expect(() => classifyRecording(reciter, null, {})).toThrow('Missing probe')
  expect(() => classifySurah(115, { sizeBytes: 1000 }, null)).toThrow('Surah must be')
})

test('the shipped support catalog is populated and structurally valid offline', () => {
  expect(QURAN_SUPPORT_VERSION).toBe(1)
  // A placeholder cannot pass the gate or accidentally ship as a valid catalog.
  expect(Object.keys(QURAN_SUPPORT).length > 0).toBe(true)
  const reasons = new Set(['no-timing', 'timing-error', 'clip-too-big', 'unreachable'])
  const surahKey = (key: string) => /^[1-9]\d*$/.test(key) && Number(key) <= 114
  for (const [key, recording] of Object.entries(QURAN_SUPPORT)) {
    expect(/^[1-9]\d*:[1-9]\d*$/.test(key)).toBe(true)
    expect(typeof recording.name === 'string' && recording.name.length > 0).toBe(true)
    expect(/^https:\/\/[a-z0-9.-]+\/[a-z0-9/_-]*\/$/i.test(recording.server)).toBe(true)
    expect(recording.timingReadId === null || Number.isSafeInteger(recording.timingReadId) && recording.timingReadId > 0).toBe(true)
    for (const [surah, size] of Object.entries(recording.split)) {
      expect(surahKey(surah)).toBe(true)
      expect(Number.isSafeInteger(size) && size! >= AUDIO_LIMIT_BYTES).toBe(true)
      expect(recording.unavailable[Number(surah)]).toBeUndefined()
      expect(recording.timingReadId !== null).toBe(true)
    }
    for (const [surah, reason] of Object.entries(recording.unavailable)) {
      expect(surahKey(surah)).toBe(true)
      expect(reasons.has(reason!)).toBe(true)
      if (reason === 'no-timing') expect(recording.timingReadId).toBe(null)
    }
  }
})

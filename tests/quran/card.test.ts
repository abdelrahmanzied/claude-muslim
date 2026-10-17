import { expect, test } from 'claude-code/testing'
import { cardModel } from '../../src/features/quran/card.ts'
import type { QuranPlaying, QuranRepeat } from '../../types/index.d.ts'
import { toggleRepeat } from '../../src/features/quran/player.ts'
import { fixtureCatalog } from './fixtures/catalog.ts'
import type { TrackSelection } from '../../src/features/quran/card.ts'
import { AUDIO_LIMIT_BYTES, timedSegments } from '../../src/features/quran/segments.ts'

const build = (surah = 18, durationMs: number | null = 10000, elapsed = 5000) => cardModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 1, { moshafKey: '10:21', surah, startedAt: 0, durationMs }, elapsed, 380, 7)

test('card model preserves authored choices, formats time, bounds progress and stops after 114', () => {
  const model = build()
  expect(model.title).toBe('سورة الكهف')
  expect(model.status).toBe('يتلى الآن')
  expect(model.reciter).toBe('محمد صديق المنشاوي · حفص عن عاصم')
  expect(model.elapsed).toBe('00:05')
  expect(model.total).toBe('00:10')
  expect(model.progress).toBe(0.5)
  expect(model.next).toBe('التالي تلقائي: Fixture 19')
  expect(model.generation).toBe(7)
  expect(build(18, null).total).toBe('--:--')
  expect(build(18, null).progress).toBe(0)
  expect(build(18, 1000).progress).toBe(1)
  expect(build(18, 10000, -500).progress).toBe(0)
  expect(build(114).next).toBe('بعد سورة الناس يتوقف التشغيل')
  expect(build(18, 8000000, 3661000).elapsed).toBe('1:01:01')
  const stopped = cardModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 18, null, 100, 380, 8)
  expect(stopped.status).toBe('متوقف')
  expect(stopped.next).toContain('التالي تلقائي')
  expect(stopped.elapsed).toBe('00:00')
})

test('quarter boundary controls remain enabled across surahs and the last quarter names the next surah', () => {
  const segments = timedSegments(Array.from({ length: 286 }, (_, i) => ({ ayah: i + 1, start_time: i * 1000, end_time: (i + 1) * 1000 })), 2, AUDIO_LIMIT_BYTES * 2)
  const selection: TrackSelection = { segments, selectedSegment: 0, durationMs: 286000, loading: null }
  const buildQuarter = (surah: number, index: number) => cardModel(fixtureCatalog, fixtureCatalog.reciters[0]!, surah, { moshafKey: '10:20', surah, startedAt: 0, durationMs: 1000, segmentIndex: index, segmentCount: segments.length }, 500, 380, 1, { ...selection, selectedSegment: index })
  expect(buildQuarter(2, 0).canPrev).toBe(true)
  expect(buildQuarter(2, 0).next).toBe('التالي: البقرة · الربع ٢ - الآيات ٢٦–٤٣')
  expect(buildQuarter(2, segments.length - 1).canNext).toBe(true)
  expect(buildQuarter(2, segments.length - 1).next).toBe('التالي تلقائي: آل عمران')
  expect(buildQuarter(1, 0).canPrev).toBe(false)
  expect(buildQuarter(114, segments.length - 1).canNext).toBe(false)
  expect(buildQuarter(114, segments.length - 1).next).toBe('بعد سورة الناس يتوقف التشغيل')
})

const quarters = timedSegments(Array.from({ length: 286 }, (_, i) => ({ ayah: i + 1, start_time: i * 1000, end_time: (i + 1) * 1000 })), 2, AUDIO_LIMIT_BYTES * 2)
const split = (repeat: QuranRepeat, index = 0, playing: QuranPlaying | null = null) => cardModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 2, playing, 0, 380, 1, { segments: quarters, selectedSegment: index, durationMs: 286000, loading: null }, repeat)
test('repeat modes are mutually exclusive in the pure rule and the hint names the quarter', () => {
  expect(toggleRepeat('off', 'surah')).toBe('surah')
  expect(toggleRepeat('surah', 'segment')).toBe('segment')
  expect(toggleRepeat('segment', 'surah')).toBe('surah')
  expect(toggleRepeat('surah', 'surah')).toBe('off')
  expect(toggleRepeat('segment', 'segment')).toBe('off')
  expect(split('segment', 7).next).toBe('تكرار: الربع ٨ - الآيات ١٢٤–١٤١')
  expect(split('segment', 4, { moshafKey: '10:20', surah: 2, startedAt: 0, durationMs: 1000, segmentIndex: 4, segmentCount: 20 }).next).toContain('تكرار: الربع ٥')
})

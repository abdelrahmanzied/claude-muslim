import { expect, test } from 'claude-code/testing'
import { DEFAULT_SERVER, defaultReciter, readSurahs } from '../../src/features/quran/catalog.ts'
import { QURAN_CATALOG, QURAN_RECITERS, QURAN_SURAHS } from '../../src/features/quran/catalog-data.ts'
import { QURAN_SUPPORT } from '../../src/features/quran/reciter-support.ts'

test('the shipped player catalog has all 114 authored surah names in order', () => {
  expect(QURAN_SURAHS.map(s => s.id)).toEqual(Array.from({ length: 114 }, (_, i) => i + 1))
  expect(readSurahs({ suwar: QURAN_SURAHS })).toEqual(QURAN_SURAHS)
  expect(QURAN_SURAHS.every(s => s.name.trim().length > 0)).toBe(true)
  expect(QURAN_CATALOG.surahs).toEqual(QURAN_SURAHS)
})

test('the shipped recordings include the default and each has support metadata', () => {
  expect(QURAN_RECITERS.length > 0).toBe(true)
  expect(new Set(QURAN_RECITERS.map(r => r.key)).size).toBe(QURAN_RECITERS.length)
  expect(defaultReciter(QURAN_CATALOG).server).toBe(DEFAULT_SERVER)
  expect(QURAN_CATALOG.reciters).toEqual(QURAN_RECITERS)
  for (const reciter of QURAN_RECITERS) {
    expect(/^[1-9]\d*:[1-9]\d*$/.test(reciter.key)).toBe(true)
    expect(reciter.name.length > 0 && reciter.label.length > 0).toBe(true)
    expect(QURAN_SUPPORT[reciter.key]).toBeDefined()
    expect(QURAN_SUPPORT[reciter.key]?.server).toBe(reciter.server)
  }
})

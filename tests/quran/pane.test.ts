import { expect, test } from 'claude-code/testing'
import { arabicDigits, isPickMessage, options, safeWidth, paneModel } from '../../src/features/quran/pane.ts'
import { fixtureCatalog } from './fixtures/catalog.ts'

const model = paneModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 18, { moshafKey: '10:20', surah: 18, durationMs: 60000, startedAt: 0 }, 10000, 420, 4, 0, true, null)

test('whole pane model includes full catalogs, authoritative selected keys and playback fields', () => {
  expect(model.reciters).toEqual(fixtureCatalog.reciters)
  expect(model.surahs).toHaveLength(114)
  expect(model.selectedReciter).toBe('10:20')
  expect(model.selectedSurah).toBe(18)
  expect(model.title).toBe('سورة الكهف')
  expect(model.elapsed).toBe('00:10')
  expect(model.focusRevision).toBe(0)
  expect(model.error).toBe('')
  expect(options(model, 'surah', '')).toHaveLength(114)
  expect(options(model, 'surah', '١٨')[0]?.value).toBe('18')
  expect(options(model, 'reciter', 'مجود')[0]?.value).toBe('10:21')
  expect(arabicDigits(114)).toBe('١١٤')
})

test('pane widths stay finite and in range when a closing or expanded pane reports 0, undefined or NaN', () => {
  for (const bad of [0, -5, NaN, Infinity, undefined, null, '80']) {
    expect(safeWidth(bad)).toBe(480)
    const bounded = paneModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 18, null, 0, safeWidth(bad), 1, 0, false, null)
    expect(Number.isFinite(bounded.width) && bounded.width >= 240 && bounded.width <= 1200).toBe(true)
  }
  expect(paneModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 18, null, 0, NaN, 1, 0, false, null).width).toBe(240)
  expect(safeWidth(5000 * 8.4)).toBe(1200)
  expect(safeWidth(10 * 8.4)).toBe(240)
})


test('supported recording hides unavailable options from every search and leaves reciters unchanged', () => {
  const limited = paneModel(fixtureCatalog, { ...fixtureCatalog.reciters[0]!, key: '102:102' }, 1, null, 0, 420, 0, 0, true, null)
  expect(options(limited, 'surah', '')).toHaveLength(109)
  for (const query of ['2', '٢', 'البقرة', 'بقر', '3', 'آل عمران', '7']) expect(options(limited, 'surah', query)).toEqual([])
  expect(options(limited, 'surah', '6')[0]?.value).toBe('6')
  expect(options(limited, 'reciter', '').map(o => o.value)).toEqual(options(model, 'reciter', '').map(o => o.value))
  expect(limited.next).toBe('التالي تلقائي: Fixture 6')
  const restored = paneModel(fixtureCatalog, { ...fixtureCatalog.reciters[0]!, key: '102:102' }, 2, null, 0, 420, 0, 0, true, null)
  expect(restored.selectedSurah).toBe(6)
})

test('a pick message carries a validated list and value', () => {
  expect(isPickMessage({ act: 'pick', list: 'surah', value: '18' })).toBe(true)
  expect(isPickMessage({ act: 'pick', list: 'reciter', value: '10:20' })).toBe(true)
  expect(isPickMessage({ act: 'pick', list: 'other', value: '18' })).toBe(false)
  expect(isPickMessage({ act: 'pick', list: 'surah', value: 'x' })).toBe(false)
})

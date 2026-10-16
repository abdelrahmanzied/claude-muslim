import { expect, test } from 'claude-code/testing'
import { LIST_BACK, LIST_ROWS_TOP, isPickerMessage, COMPACT_ROW_HEIGHT, LIST_MAX_HEIGHT, listPageLayout, openPicker, options, paneHeight, paneHit, paneModel, paneSvg, pickerInitial, turnPage, typeQuery } from '../../src/features/quran/pane.ts'
import { pointerPixels, pointerSlack } from '../../src/features/quran/card.ts'
import { AUDIO_LIMIT_BYTES, timedSegments } from '../../src/features/quran/segments.ts'
import { fixtureCatalog } from './fixtures/catalog.ts'

const model = paneModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 18, null, 0, 420, 0, 3, true, null)
test('list page geometry stays within the 4096px Svg limit and its pages cover every row once', () => {
  const segments = timedSegments(Array.from({ length: 286 }, (_, i) => ({ ayah: i + 1, start_time: i * 1000, end_time: (i + 1) * 1000 })), 2, AUDIO_LIMIT_BYTES * 2)
  const reciters = Array.from({ length: 220 }, (_, i) => ({ ...fixtureCatalog.reciters[0]!, key: `${100 + i}:20`, label: `قارئ ${i + 1}` }))
  const picture = { ...model, reciters, selection: { segments, selectedSegment: 0, durationMs: 286000, loading: null } }
  for (const list of ['reciter', 'surah', 'segment'] as const) {
    let picker = { ...openPicker(picture, pickerInitial(picture), list), highlight: 0 }
    const matches = options(picture, list, '')
    const seen: string[] = []
    for (let turns = 0; turns < 10; turns++) {
      const page = listPageLayout(picture, picker)
      expect(page.count).toBe(matches.length)
      expect(page.rowHeight).toBe(list === 'segment' ? 46 : list === 'reciter' ? COMPACT_ROW_HEIGHT : 34)
      expect(page.height).toBeLessThanOrEqual(LIST_MAX_HEIGHT)
      expect(paneHeight(picture, picker)).toBe(page.height)
      const svg = paneSvg(picture, picker)
      expect(svg).toContain(`height="${page.height}"`)
      expect(svg.match(/role="option"/g)).toHaveLength(page.end - page.start)
      expect(svg.includes('aria-label="السابق"')).toBe(page.prev)
      expect(svg.includes('aria-label="التالي"')).toBe(page.next)
      expect(svg).not.toContain('role="scrollbar"')
      expect(svg).not.toContain('class="player"')
      seen.push(...matches.slice(page.start, page.end).map(o => o.value))
      if (!page.next) break
      picker = turnPage(picture, picker, 1)
    }
    expect(seen).toEqual(matches.map(o => o.value))
  }
  // The whole surah list fits one page, even with the unavailable-surahs note.
  const surahs = listPageLayout(model, openPicker(model, pickerInitial(model), 'surah'))
  expect([surahs.prev, surahs.next, surahs.end - surahs.start]).toEqual([false, false, 114])
})
test('a 155-reciter list tightens its rows to fit one page; a short list keeps 34px rows', () => {
  const reciters = Array.from({ length: 155 }, (_, i) => ({ ...fixtureCatalog.reciters[0]!, key: `${100 + i}:20`, label: `قارئ ${i + 1}` }))
  const picture = { ...model, reciters }
  const page = listPageLayout(picture, openPicker(picture, pickerInitial(picture), 'reciter'))
  expect([page.rowHeight, page.prev, page.next, page.end - page.start]).toEqual([25, false, false, 155])
  expect(page.height).toBeLessThanOrEqual(LIST_MAX_HEIGHT)
  expect(paneSvg(picture, openPicker(picture, pickerInitial(picture), 'reciter'))).toContain('height:25px;padding:0 10px')
  expect(listPageLayout(model, openPicker(model, pickerInitial(model), 'reciter')).rowHeight).toBe(34)
})
test('turn rows hit as pages: «التالي» lands on the next page\'s first row, «السابق» on the previous page\'s last', () => {
  const reciters = Array.from({ length: 220 }, (_, i) => ({ ...fixtureCatalog.reciters[0]!, key: `${100 + i}:20`, label: `قارئ ${i + 1}` }))
  const picture = { ...model, reciters }
  const first = { ...openPicker(picture, pickerInitial(picture), 'reciter'), highlight: 0 }
  const page = listPageLayout(picture, first)
  expect([page.prev, page.next]).toEqual([false, true])
  expect(paneHit(picture, first, 210, page.rowsTop + (page.end - page.start + 0.5) * page.rowHeight)).toEqual({ act: 'page', delta: 1 })
  const second = turnPage(picture, first, 1)
  expect(second.highlight).toBe(page.end)
  const next = listPageLayout(picture, second)
  expect([next.start, next.prev]).toEqual([page.end, true])
  expect(paneHit(picture, second, 210, next.rowsTop + 0.5 * next.rowHeight)).toEqual({ act: 'page', delta: -1 })
  expect(paneHit(picture, second, 210, next.rowsTop + 1.5 * next.rowHeight)).toEqual({ act: 'row', index: next.start })
  expect(turnPage(picture, second, -1).highlight).toBe(page.end - 1)
})
test('tall page hit testing uses the full Client region with fine or whole cells, including the last row', () => {
  const picker = openPicker(model, pickerInitial(model), 'surah')
  const page = listPageLayout(model, picker)
  const rows = Math.ceil(page.height / 19), columns = 50
  for (const index of [0, 17, 80, 113]) {
    const pixelY = page.rowsTop + (index + 0.5) * page.rowHeight
    for (const fine of [true, false]) {
      const cellY = pixelY * rows / page.height
      const y = fine ? cellY : Math.floor(cellY) + 0.5
      const point = pointerPixels(420, 25, y, columns, rows, page.height)
      expect(paneHit(model, picker, point.x, point.y, pointerSlack(420, columns, rows, page.height, !fine))).toEqual({ act: 'row', index })
    }
  }
  expect(paneHit(model, picker, 210, page.rowsBottom)).toEqual({ act: 'panel' })
  expect(paneHit(model, picker, LIST_BACK.x + 10, LIST_BACK.y + LIST_BACK.height + 4, { x: 4, y: 9 })).toEqual({ act: 'close' })
})
test('search changes page height, matches normalized Arabic or exact numbers, and empty results are inert', () => {
  const picker = openPicker(model, pickerInitial(model), 'surah')
  for (const query of ['18', '١٨', 'الكهف', 'الْكَهْف']) {
    const filtered = { ...picker, query }
    expect(options(model, 'surah', query).map(o => o.value)).toEqual(['18'])
    expect(listPageLayout(model, filtered).height).toBe(LIST_ROWS_TOP + 34 + 20)
    expect(paneHit(model, filtered, 210, LIST_ROWS_TOP + 17)).toEqual({ act: 'row', index: 0 })
  }
  const empty = { ...picker, query: 'no such surah' }
  expect(options(model, 'surah', empty.query)).toEqual([])
  expect(paneHit(model, empty, 210, LIST_ROWS_TOP + 17)).toEqual({ act: 'panel' })
  expect(paneSvg(model, empty)).toContain('لا توجد نتائج')
  expect(typeQuery({ ...picker, query: 'ا😀' }, 'backspace').query).toBe('ا')
})
test('picker transitions carry only a list and focus revision, with no wheel measurements', () => {
  expect(isPickerMessage({ act: 'picker', list: 'surah', focusRevision: 3 })).toBe(true)
  expect(isPickerMessage({ act: 'picker', list: null, focusRevision: 3 })).toBe(true)
  for (const change of [{ list: 'other' }, { focusRevision: -1 }, { focusRevision: NaN }, { focusRevision: 0.5 }]) expect(isPickerMessage({ act: 'picker', list: 'surah', focusRevision: 3, ...change })).toBe(false)
})

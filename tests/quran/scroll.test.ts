import { expect, test } from 'claude-code/testing'
import { PANE_HEIGHT, SEGMENT_EXTRA, beginPickerDrag, dragPicker, pickerFooterTop, pickerOverlayHeight, pickerScrollbar, paneHit, paneSvg, openPicker, options, overlayTop, paneModel, pickerInitial, scrollPicker, typeQuery } from '../../src/features/quran/pane.ts'
import { cardSvg } from '../../src/features/quran/card.ts'
import { unavailableSurahs } from '../../src/features/quran/availability.ts'
import { fixtureCatalog } from './fixtures/catalog.ts'

const model = paneModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 1, null, 0, 420, 0, 3, true, null)
test('scrolling reaches both ends of a full list and Enter always selects a visible row', () => {
  const initial = openPicker(model, pickerInitial(model), 'surah')
  const down = scrollPicker(initial, 114, 12)
  expect(down.scroll).toBe(12)
  expect(options(model, 'surah', '')[down.highlight]?.value).toBe('13')
  const end = scrollPicker(down, 114, 1000)
  expect(end.scroll).toBe(106)
  expect(end.highlight).toBe(106)
  expect(scrollPicker(end, 114, -1000).scroll).toBe(0)
  expect(scrollPicker(end, 114, -1000).highlight).toBe(7)
})
test('filtered and short lists clamp scrolling to their matching rows', () => {
  const initial = openPicker(model, pickerInitial(model), 'surah')
  const filtered = typeQuery(initial, '١٨')
  const moved = scrollPicker(filtered, options(model, 'surah', filtered.query).length, 40)
  expect(moved.scroll).toBe(0)
  expect(moved.highlight).toBe(0)
  expect(options(model, 'surah', filtered.query)[moved.highlight]?.value).toBe('18')
  expect(scrollPicker(initial, 3, 100).scroll).toBe(0)
})
test('the footer is one line: the position and a short English hint, with no page buttons', () => {
  for (const list of ['reciter', 'surah'] as const) {
    const state = openPicker(model, pickerInitial(model), list)
    const footer = overlayTop(list) + pickerFooterTop(list, list === 'surah' ? unavailableSurahs(model.selectedReciter).length : 0)
    const svg = paneSvg(model, state)
    expect(svg).toContain('<div class="picker-hint" dir="ltr">Use ↑ ↓ for scrolling</div>')
    expect(svg).toContain('<div class="picker-count" dir="rtl">')
    expect(svg).toContain('.picker-count{position:absolute;right:12px;left:auto;')
    expect(svg).toContain('.picker-hint{position:absolute;left:12px;right:auto;')
    // The footer classes are picker-scoped: no style sheet of the embedded player card may match them.
    const cardCss = cardSvg({ ...model, width: model.width - 40 }, null).match(/<style>([\s\S]*?)<\/style>/)![1]!
    for (const name of ['picker-footer', 'picker-count', 'picker-hint']) expect(cardCss).not.toContain(name)
    for (const generic of ['footer', 'more']) expect(cardCss).not.toContain(`.${generic}{`)
    expect(svg).not.toContain('role="button" aria-label="الصفحة')
    expect(paneHit(model, state, 40, footer + 15)).toEqual({ act: 'panel' })
    expect(paneHit(model, state, 420 - 40, footer + 15)).toEqual({ act: 'panel' })
  }
  // One highlight, tinted lightly with the main color; the chosen row more strongly.
  const svg = paneSvg(model, openPicker(model, pickerInitial(model), 'surah'))
  expect(svg).toContain('.option.hot{background:color-mix(in srgb,var(--q-accent) 20%,transparent)}')
  expect(svg).toContain('.option.selected{border-right:3px solid var(--q-accent);background:color-mix(in srgb,var(--q-accent) 34%,transparent)}')
  expect(svg.match(/class="option [a-z]* ?hot"/g)).toHaveLength(1)
})
test('every open list, footer included, ends inside the pane picture', () => {
  for (const list of ['reciter', 'surah'] as const) expect(overlayTop(list) + pickerOverlayHeight(list, 1)).toBeLessThanOrEqual(PANE_HEIGHT)
  expect(overlayTop('segment') + pickerOverlayHeight('segment')).toBeLessThanOrEqual(PANE_HEIGHT + SEGMENT_EXTRA)
})

test('dragging either catalog scrollbar reaches both ends without changing the selection', () => {
  const reciters = Array.from({ length: 155 }, (_, i) => ({ ...fixtureCatalog.reciters[0]!, key: `${100 + i}:20` }))
  const picture = { ...model, reciters }
  for (const list of ['reciter', 'surah'] as const) {
    const state = { ...openPicker(picture, pickerInitial(picture), list), scroll: 0 }
    const count = options(picture, list, '').length
    const bar = pickerScrollbar(state, count)!
    const started = beginPickerDrag(state, count, bar.thumbTop + bar.thumbHeight / 2)!
    expect(started.picker.scroll).toBe(0)
    const end = dragPicker(started.picker, count, started.drag, started.drag.y + bar.height)
    expect(end.scroll).toBe(count - 8)
    expect(end.highlight >= end.scroll && end.highlight < end.scroll + 8).toBe(true)
    const endBar = pickerScrollbar(end, count)!
    const reverse = beginPickerDrag(end, count, endBar.thumbTop + endBar.thumbHeight / 2)!
    expect(dragPicker(reverse.picker, count, reverse.drag, reverse.drag.y - bar.height).scroll).toBe(0)
    expect(dragPicker(end, count, reverse.drag, reverse.drag.y + 10000).scroll).toBe(count - 8)
    expect(paneHit(picture, state, 28, bar.top + 10)).toEqual({ act: 'scrollbar' })
    expect(paneHit(picture, state, 210, bar.top + 10)).toEqual({ act: 'row', index: 0 })
    expect(paneSvg(picture, state)).toContain('role="scrollbar"')
    expect(paneSvg(picture, end)).toContain(`aria-valuenow="${count - 8}"`)
  }
})
test('track clicks jump, small moves scale smoothly, and search removes an unnecessary scrollbar', () => {
  const state = { ...openPicker(model, pickerInitial(model), 'surah'), scroll: 0 }
  const bar = pickerScrollbar(state, 114)!
  const middle = beginPickerDrag(state, 114, bar.top + bar.height / 2)!
  expect(middle.picker.scroll).toBe(53)
  expect(dragPicker(middle.picker, 114, middle.drag, middle.drag.y + 2).scroll).toBe(54)
  const filtered = typeQuery(middle.picker, '١٨')
  const count = options(model, 'surah', filtered.query).length
  expect(pickerScrollbar(filtered, count)).toBe(null)
  expect(beginPickerDrag(filtered, count, bar.top)).toBe(null)
  expect(paneSvg(model, filtered)).not.toContain('role="scrollbar"')
  expect(pickerScrollbar(pickerInitial(model), 114)).toBe(null)
  expect(beginPickerDrag(state, 114, NaN)).toBe(null)
  expect(dragPicker(state, 114, middle.drag, NaN)).toEqual(state)
})

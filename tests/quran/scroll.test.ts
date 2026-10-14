import type { UiScrollInput } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import { PANE_HEIGHT, beginPickerDrag, dragPicker, pickerScrollbar, paneHit, paneSvg, isPickerMessage, openPicker, options, overlayTop, paneModel, pickerInitial, pickerWheelDelta, scrollPicker, typeQuery, type List, type PickerMessage } from '../../src/features/quran/pane.ts'
import { fixtureCatalog } from './fixtures/catalog.ts'

const model = paneModel(fixtureCatalog, fixtureCatalog.reciters[0]!, 1, null, 0, 420, 0, 3, true, null)
const metadata = (list: List | null): PickerMessage => ({ act: 'picker', list, width: 420, columns: 50, rows: 32, focusRevision: 3, overList: false })
const wheel = (list: List, by = 3, offset = 0): UiScrollInput => ({ component: 'Pane', requestId: 'quran', by, offset: offset + by, bodyRows: 32, contentRows: 40, origin: { kind: 'person' }, pointer: { column: 24, row: (overlayTop(list) + 75) * 32 / PANE_HEIGHT - offset - 0.5 } })

test('wheel routing targets either open dropdown and accounts for a scrolled pane', () => {
  for (const list of ['reciter', 'surah'] as const) {
    expect(pickerWheelDelta(metadata(list), wheel(list), 3, 0)).toBe(1)
    expect(pickerWheelDelta(metadata(list), wheel(list, -2, 4), 3, 4)).toBe(-1)
    expect(pickerWheelDelta(metadata(list), wheel(list, 0.2), 3, 0)).toBe(1)
  }
})
test('wheel routing leaves host scrolling available outside the list or after focus loss', () => {
  const event = wheel('surah')
  expect(pickerWheelDelta(null, event, 3, 0)).toBe(0)
  expect(pickerWheelDelta(metadata(null), event, 3, 0)).toBe(0)
  expect(pickerWheelDelta(metadata('surah'), event, 4, 0)).toBe(0)
  expect(pickerWheelDelta(metadata('surah'), { ...event, pointer: { column: 24, row: 1 } }, 3, 0)).toBe(0)
  expect(pickerWheelDelta(metadata('surah'), { ...event, pointer: { column: -1, row: 10 } }, 3, 0)).toBe(0)
  expect(pickerWheelDelta(metadata('surah'), { ...event, origin: { kind: 'plugin', name: 'muslim' } }, 3, 0)).toBe(0)
  expect(pickerWheelDelta(metadata('surah'), { ...event, pointer: undefined }, 3, 0)).toBe(0)
  expect(pickerWheelDelta(metadata('surah'), { ...event, by: NaN }, 3, 0)).toBe(0)
})
test('wheel scrolling reaches both ends of a full list and Enter always selects a visible row', () => {
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
test('filtered and short lists clamp wheel movement to their matching rows', () => {
  const initial = openPicker(model, pickerInitial(model), 'surah')
  const filtered = typeQuery(initial, '١٨')
  const moved = scrollPicker(filtered, options(model, 'surah', filtered.query).length, 40)
  expect(moved.scroll).toBe(0)
  expect(moved.highlight).toBe(0)
  expect(options(model, 'surah', filtered.query)[moved.highlight]?.value).toBe('18')
  expect(scrollPicker({ ...initial, hover: 3 }, 0, 4).hover).toBe(-1)
  expect(scrollPicker(initial, 3, 100).scroll).toBe(0)
})
test('picker metadata refuses invalid lists, measurements and stale-style revisions', () => {
  expect(isPickerMessage(metadata('reciter'))).toBe(true)
  expect(isPickerMessage(metadata(null))).toBe(true)
  for (const change of [{ list: 'other' }, { columns: 0 }, { rows: NaN }, { width: 1201 }, { focusRevision: -1 }, { focusRevision: 0.5 }]) expect(isPickerMessage({ ...metadata('surah'), ...change })).toBe(false)
})

test('desktop wheel without coordinates uses Client hover and stops routing after leaving the overlay', () => {
  for (const list of ['reciter', 'surah'] as const) {
    const event = { ...wheel(list), pointer: undefined }
    expect(pickerWheelDelta({ ...metadata(list), overList: true }, event, 3, 0)).toBe(1)
    expect(pickerWheelDelta(metadata(list), event, 3, 0)).toBe(0)
    expect(pickerWheelDelta({ ...metadata(list), overList: true }, { ...event, by: -4 }, 3, 0)).toBe(-1)
    expect(pickerWheelDelta({ ...metadata(null), overList: true }, event, 3, 0)).toBe(0)
    expect(pickerWheelDelta({ ...metadata(list), overList: true }, event, 4, 0)).toBe(0)
  }
  expect(isPickerMessage({ ...metadata('reciter'), overList: undefined })).toBe(false)
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

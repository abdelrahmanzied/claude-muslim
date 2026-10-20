import { expect, test } from 'claude-code/testing'
import { dragBar, isPanePicker, openPicker, pickerKey, pickerView, pressBar } from '../../src/features/muslim-pane/picker.ts'

const opts = (n: number) => Array.from({ length: n }, (_, i) => ({ value: String(i), label: `x${i}`, number: String(i + 1), selected: i === 2 }))

test('opening highlights the current choice and keeps it in view', () => {
  expect(openPicker('surah', 114, 0)).toEqual({ list: 'surah', query: '', highlight: 0, scroll: 0, drag: null })
  expect(openPicker('surah', 114, 17)).toMatchObject({ highlight: 17, scroll: 14 })
  expect(openPicker('reciter', 5, 99)).toMatchObject({ highlight: 4, scroll: 0 })
})

test('keys move, type, choose and close', () => {
  const p = openPicker('surah', 114, 0)
  expect(pickerKey(p, 'down', 114).picker?.highlight).toBe(1)
  expect(pickerKey(p, 'up', 114).picker?.highlight).toBe(0)
  expect(pickerKey(p, 'ب', 114).picker?.query).toBe('ب')
  expect(pickerKey({ ...p, query: 'ab' }, 'backspace', 114).picker?.query).toBe('a')
  expect(pickerKey(p, 'return', 114)).toEqual({ picker: p, choose: 0 })
  expect(pickerKey({ ...p, highlight: 50 }, 'return', 3).choose).toBe(2)
  expect(pickerKey(p, 'return', 0).choose).toBeNull()
  expect(pickerKey(p, 'escape', 114).picker).toBeNull()
  expect(pickerKey(p, 'tab', 114).picker).toBeNull()
  expect(pickerKey(p, 'f5', 114)).toEqual({ picker: p, choose: null })
})

test('the scrollbar press and drag change only the scroll, and the end clears the drag', () => {
  const p = openPicker('surah', 114, 0)
  const pressed = pressBar(p, 114, 400, 400 + 1 + 100 + 272, 34)
  expect(pressed.scroll).toBe(106)
  expect(pressed.drag).toMatchObject({ cell: 34 })
  const dragged = dragBar(pressed, 114, 400, 0, 34, false)
  expect(dragged.drag).not.toBeNull()
  expect(dragBar(dragged, 114, 400, 0, 34, true).drag).toBeNull()
  expect(dragBar(p, 114, 400, 3, 34, false)).toBe(p)
})

test('the view slices eight rows and clamps a stale position', () => {
  const v = pickerView({ ...openPicker('surah', 20, 0), highlight: 99, scroll: 99 }, opts(20))
  expect(v).toMatchObject({ count: 20, highlight: 19, scroll: 12, dragging: false })
  expect(v.rows).toHaveLength(8)
  expect(pickerView(openPicker('surah', 0, 0), []).rows).toEqual([])
})

test('stored picker state is validated', () => {
  expect(isPanePicker(openPicker('segment', 10, 1))).toBe(true)
  expect(isPanePicker({ list: 'other', query: '', highlight: 0, scroll: 0, drag: null })).toBe(false)
  expect(isPanePicker(null)).toBe(false)
  expect(isPanePicker({ list: 'surah', query: 1, highlight: 0, scroll: 0, drag: null })).toBe(false)
})

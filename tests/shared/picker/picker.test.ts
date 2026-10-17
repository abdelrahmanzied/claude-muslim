import { expect, test } from 'claude-code/testing'
import { VISIBLE_ROWS, beginPickerDrag, dragCell, dragPicker, moveHighlight, pickerScrollbar, scrollPicker, typeQuery } from '../../../src/shared/picker/index.ts'

const start = { query: '', highlight: 0, scroll: 0 }
const geometry = { top: 100, height: 272, minThumb: 28 }

test('the highlight stays inside the list and drags the window with it', () => {
  expect(moveHighlight(start, 20, -1)).toEqual(start)
  let s = start
  for (let i = 0; i < 9; i++) s = moveHighlight(s, 20, 1)
  expect(s).toEqual({ query: '', highlight: 9, scroll: 2 })
  expect(moveHighlight({ ...s, highlight: 19, scroll: 12 }, 20, 1).highlight).toBe(19)
  expect(moveHighlight(start, 0, 1)).toEqual(start)
})

test('typing edits the query and goes back to the top; backspace removes one character', () => {
  const s = typeQuery({ query: 'ab', highlight: 5, scroll: 3 }, 'ج')
  expect(s).toEqual({ query: 'abج', highlight: 0, scroll: 0 })
  expect(typeQuery(s, 'backspace').query).toBe('ab')
  expect(typeQuery(start, 'backspace').query).toBe('')
  expect(typeQuery({ ...start, query: 'x'.repeat(130) }, 'y').query).toHaveLength(120)
})

test('scrolling is clamped and keeps the highlight in view', () => {
  expect(scrollPicker(start, 20, 99).scroll).toBe(12)
  expect(scrollPicker(start, 20, 99).highlight).toBe(12)
  expect(scrollPicker({ ...start, scroll: 5, highlight: 5 }, 20, -99)).toMatchObject({ scroll: 0, highlight: 5 })
  expect(scrollPicker(start, 5, 3).scroll).toBe(0)
})

test('the scrollbar exists only for more than eight rows and the thumb follows the scroll', () => {
  expect(pickerScrollbar(start, VISIBLE_ROWS, geometry)).toBeNull()
  const top = pickerScrollbar(start, 80, geometry)!, end = pickerScrollbar({ ...start, scroll: 72 }, 80, geometry)!
  expect(top.thumbTop).toBe(100)
  expect(Math.round(end.thumbTop + end.thumbHeight)).toBe(372)
  expect(top.thumbHeight).toBeGreaterThanOrEqual(28)
})

test('pressing the track jumps; dragging moves by the frozen scale; bad numbers change nothing', () => {
  const pressed = beginPickerDrag(start, 80, geometry, 372, 34)!
  expect(pressed.picker.scroll).toBe(72)
  expect(pressed.drag).toEqual({ y: 372, scroll: 72, cell: 34 })
  const back = dragPicker(pressed.picker, 80, geometry, pressed.drag, 372 - 100)
  expect(back.scroll).toBeLessThan(72)
  expect(dragPicker(start, 80, geometry, { y: 0, scroll: 0, cell: 1 }, Number.NaN)).toBe(start)
  expect(beginPickerDrag(start, 5, geometry, 120)).toBeNull()
  expect(dragCell(400, 40)).toBe(10)
  expect(Number.isNaN(dragCell(400, 0))).toBe(true)
})

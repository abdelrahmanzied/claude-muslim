// The Quran card's open picker, as plain state transitions: which list is open, the typed query,
// the highlighted row, the scroll and a scrollbar drag in progress. The hooks module keeps the
// state in `$.state` and applies these; the rows themselves come from the Quran feature. Pure: no $.

import type { PanePicker } from '../../../types/index.d.ts'
import { VISIBLE_ROWS, beginPickerDrag, dragCell, dragPicker, moveHighlight, typeQuery } from '../../shared/picker/index.ts'
import type { PanelList, PanelOption } from '../../shared/panel/signal.ts'
import { sheetBar } from './layout.ts'

export const isPanePicker = (value: unknown): value is PanePicker => {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  const drag = v.drag as Record<string, unknown> | null
  return (v.list === 'reciter' || v.list === 'surah' || v.list === 'segment') && typeof v.query === 'string'
    && Number.isInteger(v.highlight) && Number.isInteger(v.scroll)
    && (drag === null || !!drag && typeof drag === 'object' && typeof drag.y === 'number' && typeof drag.scroll === 'number' && (drag.cell === null || typeof drag.cell === 'number'))
}

// Opens a list with the current choice highlighted and in view.
export const openPicker = (list: PanelList, count: number, selected: number): PanePicker => {
  const highlight = Math.max(0, Math.min(Math.max(0, count - 1), selected))
  return { list, query: '', highlight, scroll: Math.max(0, Math.min(Math.max(0, count - VISIBLE_ROWS), highlight - 3)), drag: null }
}

export type PickerKey = { picker: PanePicker | null; choose: number | null }
// A key with the picker open: Return chooses the highlighted row, ↑ ↓ move, typing and Backspace edit the
// query, and Tab (Escape returns the focus before it arrives) closes. Anything else changes nothing.
export const pickerKey = (picker: PanePicker, key: string, count: number): PickerKey => {
  if (key === 'return') return { picker, choose: count > 0 ? Math.min(picker.highlight, count - 1) : null }
  if (key === 'escape' || key === 'tab') return { picker: null, choose: null }
  if (key === 'up' || key === 'down') return { picker: { ...moveHighlight(picker, count, key === 'up' ? -1 : 1), drag: null }, choose: null }
  if (key === 'backspace' || Array.from(key).length === 1 && key >= ' ') return { picker: { ...typeQuery(picker, key), drag: null }, choose: null }
  return { picker, choose: null }
}

// The scrollbar: a press moves to that place and starts a drag; moves follow with the row scale frozen at the press.
export const pressBar = (picker: PanePicker, count: number, quranY: number, y: number, cell: number): PanePicker => {
  const result = beginPickerDrag(picker, count, sheetBar(quranY), y, cell)
  return result ? { ...result.picker, drag: { y: result.drag.y, scroll: result.drag.scroll, cell: Number.isFinite(result.drag.cell) ? result.drag.cell : null } } : picker
}
// `row` is the pointer's row in cells and `fallback` the pane pixels one row stands for now.
export const dragBar = (picker: PanePicker, count: number, quranY: number, row: number, fallback: number, end: boolean): PanePicker => {
  const drag = picker.drag
  if (!drag) return picker
  const cell = drag.cell ?? fallback
  const next = Number.isFinite(cell) ? dragPicker(picker, count, sheetBar(quranY), { y: drag.y, scroll: drag.scroll, cell }, row * cell) : picker
  return { ...next, drag: end ? null : drag }
}
export { dragCell }

// The picker as the card draws it: the eight visible rows and the numbers the footer shows.
export type PickerView = { list: PanelList; query: string; highlight: number; scroll: number; count: number; rows: PanelOption[]; dragging: boolean }
export const pickerView = (picker: PanePicker, options: readonly PanelOption[]): PickerView => {
  const count = options.length
  const highlight = Math.max(0, Math.min(Math.max(0, count - 1), picker.highlight))
  const scroll = Math.max(0, Math.min(Math.max(0, count - VISIBLE_ROWS), picker.scroll))
  return { list: picker.list, query: picker.query, highlight, scroll, count, rows: options.slice(scroll, scroll + VISIBLE_ROWS), dragging: picker.drag !== null }
}

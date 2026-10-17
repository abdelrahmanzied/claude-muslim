// The pure part of a searchable list picker, shared by the Quran pane and the Muslim pane's
// Quran card: eight visible rows, a highlight, typing, ↑ ↓ and a draggable scrollbar.
// The state is only what a list needs (`query`, `highlight`, `scroll`); each pane keeps the
// rest (which list is open, focus) and gives the scrollbar its own geometry. Pure: no $.

export const VISIBLE_ROWS = 8
export type PickerCore = { query: string; highlight: number; scroll: number }

export function moveHighlight<T extends PickerCore>(state: T, count: number, delta: number): T {
  const highlight = Math.max(0, Math.min(Math.max(0, count - 1), state.highlight + delta))
  const scroll = Math.max(0, Math.min(Math.max(0, count - VISIBLE_ROWS), highlight < state.scroll ? highlight : highlight >= state.scroll + VISIBLE_ROWS ? highlight - VISIBLE_ROWS + 1 : state.scroll))
  return { ...state, highlight, scroll }
}
// `key` is the typed character, or `backspace`.
export function typeQuery<T extends PickerCore>(state: T, key: string): T {
  const query = key === 'backspace' ? Array.from(state.query).slice(0, -1).join('') : state.query + key
  return { ...state, query: query.slice(0, 120), highlight: 0, scroll: 0 }
}
export function scrollPicker<T extends PickerCore>(state: T, count: number, delta: number): T {
  const scroll = Math.max(0, Math.min(Math.max(0, count - VISIBLE_ROWS), state.scroll + delta))
  const highlight = Math.max(scroll, Math.min(Math.max(0, count - 1), scroll + VISIBLE_ROWS - 1, state.highlight))
  return { ...state, scroll, highlight }
}
// Where the rows start and how tall they are together, in the pane's pixels.
export type PickerGeometry = { top: number; height: number; minThumb?: number }
export type PickerScrollbar = { top: number; height: number; thumbTop: number; thumbHeight: number; maxScroll: number }
// `cell` is the pane pixels one reported row stood for when the bar was pressed. It is frozen for the whole drag: the host's row count can change by one while the picture is swapped, and following it would move the list under a pointer that did not.
export type PickerDrag = { y: number; scroll: number; cell: number }
export const dragCell = (height: number, rows: number): number => Number.isFinite(height) && Number.isFinite(rows) && rows > 0 ? height / rows : NaN
export function pickerScrollbar(state: PickerCore, count: number, geometry: PickerGeometry): PickerScrollbar | null {
  if (count <= VISIBLE_ROWS) return null
  const { top, height } = geometry
  const maxScroll = count - VISIBLE_ROWS, thumbHeight = Math.max(geometry.minThumb ?? 24, height * VISIBLE_ROWS / count)
  return { top, height, thumbHeight, maxScroll, thumbTop: top + Math.max(0, Math.min(maxScroll, state.scroll)) / maxScroll * (height - thumbHeight) }
}
export function beginPickerDrag<T extends PickerCore>(state: T, count: number, geometry: PickerGeometry, y: number, cell = NaN): { picker: T; drag: PickerDrag } | null {
  const bar = pickerScrollbar(state, count, geometry)
  if (!bar || !Number.isFinite(y)) return null
  const target = y >= bar.thumbTop && y <= bar.thumbTop + bar.thumbHeight ? state.scroll
    : Math.round((y - bar.top - bar.thumbHeight / 2) / (bar.height - bar.thumbHeight) * bar.maxScroll)
  const picker = scrollPicker(state, count, target - state.scroll)
  return { picker, drag: { y, scroll: picker.scroll, cell } }
}
export function dragPicker<T extends PickerCore>(state: T, count: number, geometry: PickerGeometry, drag: PickerDrag, y: number): T {
  const bar = pickerScrollbar(state, count, geometry)
  if (!bar || ![drag.y, drag.scroll, y].every(Number.isFinite)) return state
  const target = Math.round(drag.scroll + (y - drag.y) / (bar.height - bar.thumbHeight) * bar.maxScroll)
  return scrollPicker(state, count, target - state.scroll)
}

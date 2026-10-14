import type { UiScrollInput } from 'claude-code'
import type { QuranPlaying, QuranRepeat } from '../../../types/index.d.ts'
import { CARD_HEIGHT, ORNAMENT_CSS, cardModel, cardSvg, ornament, paletteCss, type Theme, hitTest, pointerPixels, type CardAction, type CardModel, type TrackSelection } from './card.ts'
import { isAvailable, nearestAvailable, nextAvailable, unavailableNote, unavailableSurahs } from './availability.ts'
import { formatTime } from './player.ts'
import { normalizeName, searchReciters, searchSurahs, type Catalog, type Reciter } from './catalog.ts'
import { TAJAWAL_REGULAR_WOFF2, TAJAWAL_BOLD_WOFF2 } from './fonts-embedded.ts'

export const PANE_MIN_WIDTH = 240
export const PANE_MAX_WIDTH = 1200
// A pane closing or expanding can report zero, undefined or non-finite sizes; never let one reach an Svg.
export const safeWidth = (width: unknown, fallback = 480): number => typeof width === 'number' && Number.isFinite(width) && width > 0 ? Math.max(PANE_MIN_WIDTH, Math.min(PANE_MAX_WIDTH, Math.round(width))) : fallback
export const columnsWidth = (columns: unknown, fallback = 480): number => typeof columns === 'number' && Number.isFinite(columns) && columns > 0 ? safeWidth(columns * 8.4, fallback) : fallback
// Heading row: the bold title sits at the right edge, the LTR `/quran` label at the left edge and is never hidden. Sizes follow the
// narrow-width rules (title 23, 20 at W <= 370, 18 at W <= 300; label 12, 11 at W <= 300). The label's width is estimated
// conservatively (6 glyphs at .62em); the title is capped so it ends GAP before the label and ellipsizes if it ever needs more room.
export const HEADING_EDGE = 20
export const HEADING_GAP = 8
export const headingLayout = (width: number) => {
  const w = safeWidth(width, PANE_MIN_WIDTH)
  const titleSize = w > 370 ? 23 : w > 300 ? 20 : 18
  const labelSize = w > 300 ? 12 : 11
  const labelRight = HEADING_EDGE + Math.ceil(6 * 0.62 * labelSize)
  return { titleSize, labelSize, labelLeft: HEADING_EDGE, labelRight, titleMaxWidth: w - HEADING_EDGE - labelRight - HEADING_GAP }
}
// Vertical layout of the selected design: heading 0-65, rosette rule 65-90, labelled 46px fields every 90px, then the player.
export const FIELD_HEIGHT = 46
export const CARD_TOP = 293
export const SEGMENT_EXTRA = 118
export const PANE_HEIGHT = CARD_TOP + CARD_HEIGHT + 12
export const VISIBLE_ROWS = 8
export const ROW_HEIGHT = 34
export type List = 'reciter' | 'surah' | 'segment'
export type PaneModel = CardModel & { reciters: Reciter[]; surahs: Catalog['surahs']; selectedReciter: string; selectedSurah: number; focusRevision: number; isFocused: boolean; error: string; wheel: number; selection?: TrackSelection }
export type PickerState = { open: List | null; query: string; highlight: number; scroll: number; hover: number; focusRevision: number; wasFocused: boolean }
export type Option = { value: string; label: string; number: string; selected: boolean; detail?: string }
export const arabicDigits = (value: number): string => String(value).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]!)
export function paneModel(catalog: Catalog, reciter: Reciter, selected: number, playing: QuranPlaying | null | undefined, now: number, width: number, generation: number, focusRevision: number, isFocused: boolean, error: string | null | undefined, wheel = 0, selection?: TrackSelection, repeat: QuranRepeat = 'off', theme?: Theme): PaneModel {
  selected = nearestAvailable(reciter.key, selected) ?? selected
  const card = cardModel(catalog, reciter, selected, playing, now, safeWidth(width, PANE_MIN_WIDTH), generation, selection, repeat)
  const next = nextAvailable(reciter.key, selected, 1)
  const index = playing?.segmentIndex ?? selection?.selectedSegment ?? 0
  const segment = selection?.segments[index]
  if (card.repeat === 'off' && (!segment || index === selection!.segments.length - 1) && next !== null) card.next = `التالي تلقائي: ${catalog.surahs[next - 1]!.name}`
  card.canPrev = !!(segment && index > 0) || nextAvailable(reciter.key, selected, -1) !== null
  card.canNext = !!(segment && index < selection!.segments.length - 1) || nextAvailable(reciter.key, selected, 1) !== null
  return { ...card, ...(theme ? { theme } : {}), selection, reciters: catalog.reciters, surahs: catalog.surahs, selectedReciter: reciter.key, selectedSurah: selected, focusRevision, isFocused, error: error ?? '', wheel }
}
export const pickerInitial = (model: PaneModel): PickerState => ({ open: null, query: '', highlight: 0, scroll: 0, hover: -1, focusRevision: model.focusRevision, wasFocused: model.isFocused })
export function options(model: PaneModel, list: List, query: string): Option[] {
  if (list === 'segment') return (model.selection?.segments ?? []).map((s, i) => ({ value: String(i), label: `الآيات ${arabicDigits(s.firstAyah)}–${arabicDigits(s.lastAyah)}`, number: arabicDigits(i + 1), detail: `ربع الحزب ${arabicDigits(s.quarter)} · ${formatTime(s.durationMs)}`, selected: i === model.selection?.selectedSegment })).filter(o => normalizeName(`${o.label} ${o.number} ${o.detail}`, false).includes(normalizeName(query.replace(/[0-9]/g, d => arabicDigits(Number(d))), false)))
  return list === 'reciter' ? searchReciters(query, model.reciters).map(r => ({ value: r.key, label: r.label.replace(' — ', ' · '), number: '', selected: r.key === model.selectedReciter }))
    : searchSurahs(query, model.surahs).filter(s => isAvailable(model.selectedReciter, s.id)).map(s => ({ value: String(s.id), label: s.name, number: arabicDigits(s.id), selected: s.id === model.selectedSurah }))
}
export const fieldTop = (list: List): number => list === 'reciter' ? 135 : list === 'surah' ? 225 : 315
export const paneCardTop = (model: PaneModel): number => CARD_TOP + (model.selection?.segments.length ? SEGMENT_EXTRA : 0)
export const paneErrorHeight = (model: PaneModel): number => model.error ? Math.max(36, Math.ceil(model.error.length / Math.max(12, (model.width - 40) / 7)) * 18) : 0
export const paneRetryTop = (model: PaneModel): number => paneCardTop(model) + CARD_HEIGHT + 18 + paneErrorHeight(model)
export const paneHeight = (model: PaneModel): number => PANE_HEIGHT + (model.selection?.segments.length ? SEGMENT_EXTRA : 0) + (model.error ? paneErrorHeight(model) + 44 : 0)
export const pickerRowHeight = (list: List): number => list === 'segment' ? 46 : ROW_HEIGHT
export const pickerOverlayHeight = (list: List, unavailableCount = 0): number => 76 + VISIBLE_ROWS * pickerRowHeight(list) + (list === 'surah' && unavailableCount > 0 ? ROW_HEIGHT : 0)
export const overlayTop = (list: List): number => fieldTop(list) + FIELD_HEIGHT + 8
export function moveHighlight(state: PickerState, count: number, delta: number): PickerState {
  const highlight = Math.max(0, Math.min(Math.max(0, count - 1), state.highlight + delta))
  const scroll = Math.max(0, Math.min(Math.max(0, count - VISIBLE_ROWS), highlight < state.scroll ? highlight : highlight >= state.scroll + VISIBLE_ROWS ? highlight - VISIBLE_ROWS + 1 : state.scroll))
  return { ...state, highlight, scroll, hover: -1 }
}
export function typeQuery(state: PickerState, key: string): PickerState {
  const query = key === 'backspace' ? Array.from(state.query).slice(0, -1).join('') : state.query + key
  return { ...state, query: query.slice(0, 120), highlight: 0, scroll: 0, hover: -1 }
}
export type PickerScrollbar = { top: number; height: number; thumbTop: number; thumbHeight: number; maxScroll: number }
export type PickerDrag = { y: number; scroll: number }
export function pickerScrollbar(state: PickerState, count: number): PickerScrollbar | null {
  if (!state.open || count <= VISIBLE_ROWS) return null
  const top = overlayTop(state.open) + 56, height = VISIBLE_ROWS * pickerRowHeight(state.open)
  const maxScroll = count - VISIBLE_ROWS, thumbHeight = Math.max(24, height * VISIBLE_ROWS / count)
  return { top, height, thumbHeight, maxScroll, thumbTop: top + Math.max(0, Math.min(maxScroll, state.scroll)) / maxScroll * (height - thumbHeight) }
}
export function beginPickerDrag(state: PickerState, count: number, y: number): { picker: PickerState; drag: PickerDrag } | null {
  const bar = pickerScrollbar(state, count)
  if (!bar || !Number.isFinite(y)) return null
  const target = y >= bar.thumbTop && y <= bar.thumbTop + bar.thumbHeight ? state.scroll
    : Math.round((y - bar.top - bar.thumbHeight / 2) / (bar.height - bar.thumbHeight) * bar.maxScroll)
  const picker = scrollPicker(state, count, target - state.scroll)
  return { picker, drag: { y, scroll: picker.scroll } }
}
export function dragPicker(state: PickerState, count: number, drag: PickerDrag, y: number): PickerState {
  const bar = pickerScrollbar(state, count)
  if (!bar || ![drag.y, drag.scroll, y].every(Number.isFinite)) return state
  const target = Math.round(drag.scroll + (y - drag.y) / (bar.height - bar.thumbHeight) * bar.maxScroll)
  return scrollPicker(state, count, target - state.scroll)
}
export type PaneHit = { act: 'field'; list: List } | { act: 'row'; index: number } | { act: 'scrollbar' } | { act: 'panel' } | { act: 'close' } | { act: 'control'; action: CardAction } | null
export function paneHit(model: PaneModel, state: PickerState, x: number, y: number): PaneHit {
  if (![x, y].every(Number.isFinite)) return null
  // Open overlay owns its pixels; it must never click the player beneath it.
  if (state.open) {
    const top = overlayTop(state.open)
    if (x >= 20 && x <= model.width - 20 && y >= top && y < top + pickerOverlayHeight(state.open, unavailableSurahs(model.selectedReciter).length)) {
      const bar = pickerScrollbar(state, options(model, state.open, state.query).length)
      if (bar && x >= 22 && x <= 38 && y >= bar.top && y < bar.top + bar.height) return { act: 'scrollbar' }
      const row = Math.floor((y - top - 56) / pickerRowHeight(state.open))
      const count = options(model, state.open, state.query).length
      if (row >= 0 && row < VISIBLE_ROWS && state.scroll + row < count) return { act: 'row', index: state.scroll + row }
      return { act: 'panel' }
    }
  }
  const lists: List[] = model.selection?.segments.length ? ['reciter', 'surah', 'segment'] : ['reciter', 'surah']
  for (const list of lists) if (x >= 20 && x <= model.width - 20 && y >= fieldTop(list) && y <= fieldTop(list) + FIELD_HEIGHT) return { act: 'field', list }
  if (state.open) return { act: 'close' }
  if (model.error && x >= 20 && x <= 160 && y >= paneRetryTop(model) && y <= paneRetryTop(model) + 34) return { act: 'control', action: 'retry' }
  const action = hitTest(model.width - 40, x - 20, y - paneCardTop(model))
  if (action === 'prev' && model.canPrev === false || action === 'next' && model.canNext === false || action === 'repeat-segment' && !model.segmented) return null
  return action ? { act: 'control', action } : null
}
export function openPicker(model: PaneModel, state: PickerState, list: List): PickerState {
  if (state.open === list) return { ...state, open: null, query: '', hover: -1 }
  const all = options(model, list, '')
  const highlight = Math.max(0, all.findIndex(o => o.selected))
  return moveHighlight({ ...state, open: list, query: '', highlight, scroll: 0 }, all.length, 0)
}
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const number = (text: string) => `<bdi dir="ltr">${escape(text)}</bdi>`
export function paneSvg(model: PaneModel, state: PickerState, hover: CardAction | null = null): string {
  const selected = model.reciters.find(r => r.key === model.selectedReciter) ?? model.reciters[0]!
  const lists: List[] = model.selection?.segments.length ? ['reciter', 'surah', 'segment'] : ['reciter', 'surah']
  const fields = lists.map(list => {
    const label = list === 'reciter' ? 'القارئ' : list === 'surah' ? 'السورة' : 'ابدأ من'
    const segment = list === 'segment' ? options(model, list, '').find(o => o.selected) : undefined
    const value = list === 'reciter' ? escape(selected.label.replace(' — ', ' · ')) : list === 'surah' ? `${number(arabicDigits(model.selectedSurah))} · ${escape(model.surahs[model.selectedSurah - 1]!.name)}` : segment ? `المقطع ${number(segment.number)} · ${escape(segment.label)}` : ''
    return `<div class="field-label" style="top:${fieldTop(list) - 26}px">${label}</div><div class="field" role="combobox" aria-expanded="${state.open === list}" style="top:${fieldTop(list)}px"><span class="value">${value}</span><span class="arrow">▾</span></div>`
  }).join('')
  let dropdown = ''
  if (state.open) {
    const matches = options(model, state.open, state.query)
    const note = state.open === 'surah' ? unavailableNote(unavailableSurahs(model.selectedReciter).length) : ''
    const unavailable = note ? `<div class="unavailable-note" style="top:${56 + VISIBLE_ROWS * ROW_HEIGHT}px">${escape(note).replace(/[٠-٩]+/g, digits => number(digits))}</div>` : ''
    const rows = matches.slice(state.scroll, state.scroll + VISIBLE_ROWS).map((o, i) => `<div class="option ${o.selected ? 'selected' : ''} ${state.highlight === state.scroll + i || state.hover === state.scroll + i ? 'hot' : ''}" role="option" aria-selected="${o.selected}" style="top:${56 + i * pickerRowHeight(state.open!)}px;height:${pickerRowHeight(state.open!)}px"><span>${o.number ? `${number(o.number)} · ` : ''}${escape(o.label)}${o.detail ? `<small>${escape(o.detail)}</small>` : ''}</span><span class="check">${o.selected ? '✓' : ''}</span></div>`).join('')
    const bar = pickerScrollbar(state, matches.length)
    const scrollbar = bar ? `<div class="scrollbar" role="scrollbar" aria-label="موضع القائمة" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="${bar.maxScroll}" aria-valuenow="${state.scroll}" style="top:56px;height:${bar.height}px"><div class="thumb" style="top:${bar.thumbTop - bar.top}px;height:${bar.thumbHeight}px"></div></div>` : ''
    const placeholder = state.open === 'reciter' ? 'ابحث عن قارئ' : state.open === 'surah' ? 'ابحث عن سورة أو رقمها' : 'ابحث عن مقطع أو آية'
    dropdown = `<div class="dropdown" style="top:${overlayTop(state.open)}px;height:${pickerOverlayHeight(state.open, note ? 1 : 0)}px"><div class="search" role="searchbox">${state.query ? escape(state.query).replace(/[0-9٠-٩]+/g, digits => number(digits)) : `<span class="placeholder">${placeholder}</span>`}<span class="caret">│</span></div>${rows}${scrollbar}${unavailable}${!matches.length ? '<div class="no-results">لا توجد نتائج</div>' : ''}<div class="more">${state.scroll > 0 ? '↑ ' : ''}${state.scroll + VISIBLE_ROWS < matches.length ? '↓ المزيد · ' : ''}${matches.length ? `${number(arabicDigits(state.highlight + 1))} / ${number(arabicDigits(matches.length))}` : ''}</div></div>`
  }
  const heading = headingLayout(model.width)
  const mushaf = `<div class="mushaf" aria-label="المصحف" ><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v15M12 5C8 2 4 3 1 4v16c4-2 8-1 11 1 3-2 7-3 11-1V4c-3-1-7-2-11 1Z"/></svg><span>القرآن الكريم</span></div>`
  const command = `<div class="command" dir="ltr"><bdi dir="ltr">/quran</bdi></div>`
  const player = cardSvg({ ...model, width: model.width - 40 }, hover)
  const fonts = `@font-face{font-family:Tajawal;font-weight:400;src:url(data:font/woff2;base64,${TAJAWAL_REGULAR_WOFF2}) format('woff2')}@font-face{font-family:Tajawal;font-weight:700;src:url(data:font/woff2;base64,${TAJAWAL_BOLD_WOFF2}) format('woff2')}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${model.width}" height="${paneHeight(model)}" viewBox="0 0 ${model.width} ${paneHeight(model)}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" class="pane${model.theme ? ` theme-${model.theme}` : ''}" dir="rtl"><style>${fonts}${paletteCss('.pane', model.color)}${ORNAMENT_CSS}
*{box-sizing:border-box}.pane{position:relative;width:100%;height:100%;background:transparent;border:0;overflow:hidden;color:var(--q-text);font-family:Tajawal,sans-serif;font-weight:400;direction:rtl;text-align:right;user-select:none}.mushaf{position:absolute;right:20px;top:15px;height:36px;display:flex;align-items:center;gap:9px;color:var(--q-title);max-width:${heading.titleMaxWidth}px;font-size:${heading.titleSize}px;font-weight:700}.mushaf span{line-height:1;transform:translateY(.12em);min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.mushaf svg{color:var(--q-accent);flex-shrink:0}.command{position:absolute;left:20px;top:24px;line-height:18px;font-size:${heading.labelSize}px;white-space:nowrap;color:var(--q-dim)}.field-label{position:absolute;right:20px;left:20px;font-size:12px;color:var(--q-dim);line-height:18px}.field{position:absolute;left:20px;right:20px;height:${FIELD_HEIGHT}px;border:1px solid var(--q-line);border-radius:9px;background:var(--q-field-bg);padding:0 12px;font-size:14px;display:flex;align-items:center;justify-content:space-between;gap:10px}.field .value{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.arrow{color:var(--q-muted)}.player{position:absolute;left:20px;top:${paneCardTop(model)}px}.pane .quran{font-family:Tajawal,sans-serif;font-weight:400;text-align:right;direction:rtl}.dropdown{position:absolute;left:20px;right:20px;height:348px;border:1px solid var(--q-line);border-radius:10px;background:var(--q-dropdown-bg);z-index:5;box-shadow:var(--q-shadow);overflow:hidden}.search{position:absolute;left:8px;right:8px;top:8px;height:38px;padding:9px 10px;border:1px solid var(--q-line);border-radius:7px;background:var(--q-search-bg);font-size:14px;white-space:nowrap;overflow:hidden}.placeholder{color:var(--q-dim)}.caret{color:var(--q-accent)}.option{position:absolute;left:20px;right:6px;height:${ROW_HEIGHT}px;padding:8px 10px;border-radius:5px;display:flex;gap:8px;align-items:center;justify-content:space-between;font-size:14px;white-space:nowrap;overflow:hidden}.option>span:first-child{overflow:hidden;text-overflow:ellipsis}.scrollbar{position:absolute;left:4px;width:14px;z-index:1;border-radius:4px;background:linear-gradient(to right,transparent 3px,var(--q-scrollbar) 3px,var(--q-scrollbar) 11px,transparent 11px)}.thumb{position:absolute;left:4px;width:6px;border-radius:3px;background:var(--q-accent)}.unavailable-note{position:absolute;left:12px;right:12px;height:34px;display:flex;align-items:center;gap:4px;color:var(--q-dim);font-size:12px;pointer-events:none}.option.hot{background:var(--q-hot)}.option.selected{border-right:3px solid var(--q-accent)}.check{color:var(--q-accent)}.more{position:absolute;bottom:5px;right:12px;left:12px;color:var(--q-dim);font-size:11px;height:16px;text-align:center}.no-results{position:absolute;top:64px;right:18px;color:var(--q-dim);font-size:13px}.error{position:absolute;top:${paneCardTop(model) + CARD_HEIGHT + 6}px;line-height:18px;left:20px;right:20px;font-size:12px;color:var(--q-dim)}.option small{display:block;font-size:10px;color:var(--q-label);line-height:14px}.segment-note{position:absolute;top:${fieldTop('segment') + FIELD_HEIGHT + 8}px;left:20px;right:20px;font-size:11px;color:var(--q-dim);line-height:20px}.retry{position:absolute;left:20px;top:${paneRetryTop(model)}px;height:34px;width:140px;border:1px solid var(--q-line);border-radius:8px;color:var(--q-soft);font-size:12px;display:grid;place-items:center}bdi{unicode-bidi:isolate;direction:ltr}
</style>${mushaf}${command}${ornament(65, 20)}${fields}${model.selection?.segments.length ? `<div class="segment-note">المقطع ${number(arabicDigits((model.selection.selectedSegment ?? 0) + 1))} من ${number(arabicDigits(model.selection.segments.length))} داخل سورة ${escape(model.surahs[model.selectedSurah - 1]!.name)}</div>` : ''}<div class="player">${player}</div>${model.error ? `<div class="error">${escape(model.error)}</div><div class="retry" role="button" aria-label="إعادة المحاولة">إعادة المحاولة</div>` : ''}${dropdown}</div></foreignObject></svg>`
}

export type PickMessage = { act: 'pick'; list: List; value: string }
export function isPickMessage(value: unknown): value is PickMessage {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  return m.act === 'pick' && (m.list === 'reciter' || m.list === 'surah' || m.list === 'segment') && typeof m.value === 'string' && (m.list === 'reciter' ? /^\d+:\d+$/.test(m.value) : /^\d+$/.test(m.value))
}

export function scrollPicker(state: PickerState, count: number, delta: number): PickerState {
  const scroll = Math.max(0, Math.min(Math.max(0, count - VISIBLE_ROWS), state.scroll + delta))
  const highlight = Math.max(scroll, Math.min(Math.max(0, count - 1), scroll + VISIBLE_ROWS - 1, state.highlight))
  return { ...state, scroll, highlight, hover: -1 }
}
export type PickerMessage = { act: 'picker'; list: List | null; width: number; columns: number; rows: number; focusRevision: number; overList: boolean; height?: number }
export function isPickerMessage(value: unknown): value is PickerMessage {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  return m.act === 'picker' && typeof m.overList === 'boolean' && (m.list === null || m.list === 'reciter' || m.list === 'surah' || m.list === 'segment') && ['width', 'columns', 'rows', 'focusRevision'].every(k => typeof m[k] === 'number' && Number.isFinite(m[k])) && (m.width as number) >= 240 && (m.width as number) <= 1200 && (m.columns as number) > 0 && (m.rows as number) > 0 && (m.height === undefined || typeof m.height === 'number' && Number.isFinite(m.height) && m.height >= PANE_HEIGHT && m.height < 2000) && Number.isInteger(m.focusRevision) && (m.focusRevision as number) >= 0
}
export function pickerWheelDelta(picker: PickerMessage | null, event: UiScrollInput, focusRevision: number, offset: number): number {
  if (!picker?.list || picker.focusRevision !== focusRevision || event.origin.kind !== 'person' || !Number.isFinite(event.by) || event.by === 0) return 0
  const delta = Math.sign(event.by)
  if (!event.pointer) return picker.overList ? delta : 0
  if (![event.pointer.column, event.pointer.row, offset].every(Number.isFinite) || event.pointer.column < 0 || event.pointer.column >= picker.columns || event.pointer.row < 0 || event.pointer.row >= event.bodyRows) return 0
  const point = pointerPixels(picker.width, event.pointer.column + 0.5, event.pointer.row + offset + 0.5, picker.columns, picker.rows, picker.height ?? PANE_HEIGHT)
  const top = overlayTop(picker.list)
  return point.x >= 20 && point.x <= picker.width - 20 && point.y >= top && point.y < top + pickerOverlayHeight(picker.list) ? delta : 0
}

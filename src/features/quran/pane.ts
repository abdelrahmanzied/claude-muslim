import type { QuranPlaying, QuranRepeat } from '../../../types/index.d.ts'
import { CARD_HEIGHT, ORNAMENT_CSS, cardModel, cardSvg, ornament, paletteCss, type Theme, hitTest, type CardAction, type CardModel, type TrackSelection } from './card.ts'
import { isAvailable, nearestAvailable, nextAvailable, unavailableNote, unavailableSurahs } from './availability.ts'
import { formatTime } from './player.ts'
import { normalizeName, searchReciters, searchSurahs, type Catalog, type Reciter } from './catalog.ts'
import { tajawalFontFaceCss } from '../../shared/font/index.ts'

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
export const ROW_HEIGHT = 34
export type List = 'reciter' | 'surah' | 'segment'
export type PaneModel = CardModel & { reciters: Reciter[]; surahs: Catalog['surahs']; selectedReciter: string; selectedSurah: number; focusRevision: number; isFocused: boolean; error: string; selection?: TrackSelection }
export type PickerState = { open: List | null; query: string; highlight: number; hover: number; focusRevision: number; wasFocused: boolean }
export type Option = { value: string; label: string; number: string; selected: boolean; detail?: string }
export const arabicDigits = (value: number): string => String(value).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]!)
export function paneModel(catalog: Catalog, reciter: Reciter, selected: number, playing: QuranPlaying | null | undefined, now: number, width: number, generation: number, focusRevision: number, isFocused: boolean, error: string | null | undefined, selection?: TrackSelection, repeat: QuranRepeat = 'off', theme?: Theme): PaneModel {
  selected = nearestAvailable(reciter.key, selected) ?? selected
  const card = cardModel(catalog, reciter, selected, playing, now, safeWidth(width, PANE_MIN_WIDTH), generation, selection, repeat)
  const next = nextAvailable(reciter.key, selected, 1)
  const index = playing?.segmentIndex ?? selection?.selectedSegment ?? 0
  const segment = selection?.segments[index]
  if (card.repeat === 'off' && (!segment || index === selection!.segments.length - 1) && next !== null) card.next = `التالي تلقائي: ${catalog.surahs[next - 1]!.name}`
  card.canPrev = !!(segment && index > 0) || nextAvailable(reciter.key, selected, -1) !== null
  card.canNext = !!(segment && index < selection!.segments.length - 1) || nextAvailable(reciter.key, selected, 1) !== null
  return { ...card, ...(theme ? { theme } : {}), selection, reciters: catalog.reciters, surahs: catalog.surahs, selectedReciter: reciter.key, selectedSurah: selected, focusRevision, isFocused, error: error ?? '' }
}
export const pickerInitial = (model: PaneModel): PickerState => ({ open: null, query: '', highlight: 0, hover: -1, focusRevision: model.focusRevision, wasFocused: model.isFocused })
export function options(model: PaneModel, list: List, query: string): Option[] {
  if (list === 'segment') return (model.selection?.segments ?? []).map((s, i) => ({ value: String(i), label: `الآيات ${arabicDigits(s.firstAyah)}–${arabicDigits(s.lastAyah)}`, number: arabicDigits(i + 1), detail: `ربع الحزب ${arabicDigits(s.quarter)} · ${formatTime(s.durationMs)}`, selected: i === model.selection?.selectedSegment })).filter(o => normalizeName(`${o.label} ${o.number} ${o.detail}`, false).includes(normalizeName(query.replace(/[0-9]/g, d => arabicDigits(Number(d))), false)))
  return list === 'reciter' ? searchReciters(query, model.reciters).map(r => ({ value: r.key, label: r.label.replace(' — ', ' · '), number: '', selected: r.key === model.selectedReciter }))
    : searchSurahs(query, model.surahs).filter(s => isAvailable(model.selectedReciter, s.id)).map(s => ({ value: String(s.id), label: s.name, number: arabicDigits(s.id), selected: s.id === model.selectedSurah }))
}
export const fieldTop = (list: List): number => list === 'reciter' ? 135 : list === 'surah' ? 225 : 315
export const paneCardTop = (model: PaneModel): number => CARD_TOP + (model.selection?.segments.length ? SEGMENT_EXTRA : 0)
export const paneErrorHeight = (model: PaneModel): number => model.error ? Math.max(36, Math.ceil(model.error.length / Math.max(12, (model.width - 40) / 7)) * 18) : 0
export const paneRetryTop = (model: PaneModel): number => paneCardTop(model) + CARD_HEIGHT + 18 + paneErrorHeight(model)
const cardPaneHeight = (model: PaneModel): number => PANE_HEIGHT + (model.selection?.segments.length ? SEGMENT_EXTRA : 0) + (model.error ? paneErrorHeight(model) + 44 : 0)
export const pickerRowHeight = (list: List): number => list === 'segment' ? 46 : ROW_HEIGHT
// The host owns the only scroll window. It refuses an Svg taller than 4096px,
// so a long reciter list tightens its rows, and a list longer than one page
// even then shows pages of rows with «السابق» and «التالي».
export const LIST_ROWS_TOP = 146
export const LIST_MAX_HEIGHT = 4096
export const COMPACT_ROW_HEIGHT = 24
export const LIST_BACK = { x: 20, y: 16, width: 68, height: 34 }
export const listTitle = (list: List): string => list === 'reciter' ? 'اختيار القارئ' : list === 'surah' ? 'اختيار السورة' : 'ابدأ من'
export function listPageLayout(model: PaneModel, state: PickerState) {
  const list = state.open ?? 'surah'
  const count = options(model, list, state.query).length
  const note = list === 'surah' ? unavailableNote(unavailableSurahs(model.selectedReciter).length) : ''
  const room = LIST_MAX_HEIGHT - LIST_ROWS_TOP - (note ? ROW_HEIGHT : 0) - 20
  // A reciter list too long for 34px rows tightens them (down to 24px) so it
  // still fits one page; only a list too long even then pages.
  const full = pickerRowHeight(list)
  const rowHeight = list === 'reciter' && count * full > room ? Math.max(COMPACT_ROW_HEIGHT, Math.min(full, Math.floor(room / count))) : full
  const fit = Math.floor(room / rowHeight)
  // Every page keeps both turn slots, so pages hold the same rows whichever way they are reached.
  const perPage = count <= fit ? Math.max(1, count) : fit - 2
  const start = Math.floor(Math.max(0, Math.min(state.highlight, count - 1)) / perPage) * perPage
  const end = Math.min(count, start + perPage)
  const prev = start > 0, next = end < count
  const slots = Math.max(1, end - start + (prev ? 1 : 0) + (next ? 1 : 0))
  const rowsBottom = LIST_ROWS_TOP + slots * rowHeight
  return { count, rowHeight, rowsTop: LIST_ROWS_TOP, rowsBottom, note, start, end, prev, next, perPage, height: rowsBottom + (note ? ROW_HEIGHT : 0) + 20 }
}
// «السابق» lands on the previous page's last row, «التالي» on the next page's first.
export function turnPage(model: PaneModel, state: PickerState, delta: -1 | 1): PickerState {
  const page = listPageLayout(model, state)
  return moveHighlight({ ...state, highlight: delta < 0 ? page.start - 1 : page.end }, page.count, 0)
}
export const paneHeight = (model: PaneModel, state?: PickerState): number => state?.open ? listPageLayout(model, state).height : cardPaneHeight(model)
export function moveHighlight(state: PickerState, count: number, delta: number): PickerState {
  const highlight = Math.max(0, Math.min(Math.max(0, count - 1), state.highlight + delta))
  return { ...state, highlight, hover: -1 }
}
export function typeQuery(state: PickerState, key: string): PickerState {
  const query = key === 'backspace' ? Array.from(state.query).slice(0, -1).join('') : state.query + key
  return { ...state, query: query.slice(0, 120), highlight: 0, hover: -1 }
}
export type PaneHit = { act: 'field'; list: List } | { act: 'row'; index: number } | { act: 'page'; delta: -1 | 1 } | { act: 'panel' } | { act: 'close' } | { act: 'control'; action: CardAction } | null
export type PointerSlack = { x: number; y: number }
// Distance from a point to the nearest point of [lo, hi]; 0 inside it.
const gap = (v: number, lo: number, hi: number): number => v < lo ? lo - v : v > hi ? v - hi : 0
// `slack` is the half-extent in pixels of the pointer's cell. Desktop reports whole cells only (no `fine`), so the pointer is snapped to the
// cell center and may really be anywhere within it: field, retry and control targets count as hit when the cell overlaps them, the one
// nearest the center winning. An open list page owns the entire picture.
export function paneHit(model: PaneModel, state: PickerState, x: number, y: number, slack: PointerSlack = { x: 0, y: 0 }): PaneHit {
  if (![x, y].every(Number.isFinite)) return null
  const sx = Number.isFinite(slack.x) && slack.x > 0 ? slack.x : 0, sy = Number.isFinite(slack.y) && slack.y > 0 ? slack.y : 0
  if (state.open) {
    if (x + sx >= LIST_BACK.x && x - sx <= LIST_BACK.x + LIST_BACK.width && gap(y, LIST_BACK.y, LIST_BACK.y + LIST_BACK.height) <= sy) return { act: 'close' }
    const page = listPageLayout(model, state)
    const slot = Math.floor((y - page.rowsTop) / page.rowHeight)
    if (x < 26 || x > model.width - 26 || slot < 0) return { act: 'panel' }
    if (page.prev && slot === 0) return { act: 'page', delta: -1 }
    const index = page.start + slot - (page.prev ? 1 : 0)
    if (index < page.end) return { act: 'row', index }
    if (page.next && index === page.end) return { act: 'page', delta: 1 }
    return { act: 'panel' }
  }
  // Candidates under the cell, each with its distance from the cell center; the nearest wins.
  let best: PaneHit = null, bestDistance = Infinity
  const consider = (hit: PaneHit, distance: number) => { if (distance < bestDistance) { best = hit; bestDistance = distance } }
  const lists: List[] = model.selection?.segments.length ? ['reciter', 'surah', 'segment'] : ['reciter', 'surah']
  const inX = x + sx >= 20 && x - sx <= model.width - 20
  for (const list of lists) {
    const top = fieldTop(list), dy = gap(y, top, top + FIELD_HEIGHT)
    if (inX && dy <= sy) consider({ act: 'field', list }, dy)
  }
  if (best) return best
  if (model.error) {
    const top = paneRetryTop(model)
    if (x + sx >= 20 && x - sx <= 160 && y + sy >= top && y - sy <= top + 34) return { act: 'control', action: 'retry' }
  }
  const action = hitTest(model.width - 40, x - 20, y - paneCardTop(model), sx, sy)
  if (action === 'prev' && model.canPrev === false || action === 'next' && model.canNext === false || action === 'repeat-segment' && !model.segmented) return null
  return action ? { act: 'control', action } : null
}
export function openPicker(model: PaneModel, state: PickerState, list: List): PickerState {
  if (state.open === list) return { ...state, open: null, query: '', hover: -1 }
  const all = options(model, list, '')
  const highlight = Math.max(0, all.findIndex(o => o.selected))
  return moveHighlight({ ...state, open: list, query: '', highlight }, all.length, 0)
}
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const number = (text: string) => `<bdi dir="ltr">${escape(text)}</bdi>`
export function paneSvg(model: PaneModel, state: PickerState, hover: CardAction | null = null): string {
  if (state.open) return listPageSvg(model, state)
  const selected = model.reciters.find(r => r.key === model.selectedReciter) ?? model.reciters[0]!
  const lists: List[] = model.selection?.segments.length ? ['reciter', 'surah', 'segment'] : ['reciter', 'surah']
  const fields = lists.map(list => {
    const label = list === 'reciter' ? 'القارئ' : list === 'surah' ? 'السورة' : 'ابدأ من'
    const segment = list === 'segment' ? options(model, list, '').find(o => o.selected) : undefined
    const value = list === 'reciter' ? escape(selected.label.replace(' — ', ' · ')) : list === 'surah' ? `${number(arabicDigits(model.selectedSurah))} · ${escape(model.surahs[model.selectedSurah - 1]!.name)}` : segment ? `المقطع ${number(segment.number)} · ${escape(segment.label)}` : ''
    return `<div class="field-label" style="top:${fieldTop(list) - 26}px">${label}</div><div class="field" role="combobox" aria-expanded="${state.open === list}" style="top:${fieldTop(list)}px"><span class="value">${value}</span><span class="arrow">▾</span></div>`
  }).join('')
  const heading = headingLayout(model.width)
  const mushaf = `<div class="mushaf" aria-label="المصحف" ><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v15M12 5C8 2 4 3 1 4v16c4-2 8-1 11 1 3-2 7-3 11-1V4c-3-1-7-2-11 1Z"/></svg><span>القرآن الكريم</span></div>`
  const command = `<div class="command" dir="ltr"><bdi dir="ltr">/quran</bdi></div>`
  const player = cardSvg({ ...model, width: model.width - 40 }, hover)
  const fonts = tajawalFontFaceCss()
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${model.width}" height="${paneHeight(model)}" viewBox="0 0 ${model.width} ${paneHeight(model)}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" class="pane${model.theme ? ` theme-${model.theme}` : ''}" dir="rtl"><style>${fonts}${paletteCss('.pane', model.color)}${ORNAMENT_CSS}
*{box-sizing:border-box}.pane{position:relative;width:100%;height:100%;background:transparent;border:0;overflow:hidden;color:var(--q-text);font-family:Tajawal,sans-serif;font-weight:400;direction:rtl;text-align:right;user-select:none}.mushaf{position:absolute;right:20px;top:15px;height:36px;display:flex;align-items:center;gap:9px;color:var(--q-title);max-width:${heading.titleMaxWidth}px;font-size:${heading.titleSize}px;font-weight:700}.mushaf span{line-height:1;transform:translateY(.12em);min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.mushaf svg{color:var(--q-accent);flex-shrink:0}.command{position:absolute;left:20px;top:24px;line-height:18px;font-size:${heading.labelSize}px;white-space:nowrap;color:var(--q-dim)}.field-label{position:absolute;right:20px;left:20px;font-size:12px;color:var(--q-dim);line-height:18px}.field{position:absolute;left:20px;right:20px;height:${FIELD_HEIGHT}px;border:1px solid var(--q-line);border-radius:9px;background:var(--q-field-bg);padding:0 12px;font-size:14px;display:flex;align-items:center;justify-content:space-between;gap:10px}.field .value{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.arrow{color:var(--q-muted)}.player{position:absolute;left:20px;top:${paneCardTop(model)}px}.pane .quran{font-family:Tajawal,sans-serif;font-weight:400;text-align:right;direction:rtl}.error{position:absolute;top:${paneCardTop(model) + CARD_HEIGHT + 6}px;line-height:18px;left:20px;right:20px;font-size:12px;color:var(--q-dim)}.segment-note{position:absolute;top:${fieldTop('segment') + FIELD_HEIGHT + 8}px;left:20px;right:20px;font-size:11px;color:var(--q-dim);line-height:20px}.retry{position:absolute;left:20px;top:${paneRetryTop(model)}px;height:34px;width:140px;border:1px solid var(--q-line);border-radius:8px;color:var(--q-soft);font-size:12px;display:grid;place-items:center}bdi{unicode-bidi:isolate;direction:ltr}
</style>${mushaf}${command}${ornament(65, 20)}${fields}${model.selection?.segments.length ? `<div class="segment-note">المقطع ${number(arabicDigits((model.selection.selectedSegment ?? 0) + 1))} من ${number(arabicDigits(model.selection.segments.length))} داخل سورة ${escape(model.surahs[model.selectedSurah - 1]!.name)}</div>` : ''}<div class="player">${player}</div>${model.error ? `<div class="error">${escape(model.error)}</div><div class="retry" role="button" aria-label="إعادة المحاولة">إعادة المحاولة</div>` : ''}</div></foreignObject></svg>`
}

function listPageSvg(model: PaneModel, state: PickerState): string {
  const list = state.open!
  const page = listPageLayout(model, state)
  const range = (from: number, to: number) => `${number(arabicDigits(from + 1))}–${number(arabicDigits(to))}`
  const prev = page.prev ? `<div class="turn" role="button" aria-label="السابق">السابق · ${range(Math.max(0, page.start - page.perPage), page.start)}</div>` : ''
  const next = page.next ? `<div class="turn" role="button" aria-label="التالي">التالي · ${range(page.end, Math.min(page.count, page.end + page.perPage))}</div>` : ''
  const rows = options(model, list, state.query).slice(page.start, page.end).map((o, i) => `<div role="option" aria-selected="${o.selected}"${page.start + i === state.highlight || page.start + i === state.hover ? ' class="hot"' : ''}><span>${o.number ? `${number(o.number)} · ` : ''}${escape(o.label)}${o.detail ? `<small>${escape(o.detail)}</small>` : ''}</span><i>${o.selected ? '✓' : ''}</i></div>`).join('')
  const placeholder = list === 'reciter' ? 'ابحث عن قارئ' : list === 'surah' ? 'ابحث عن سورة أو رقمها' : 'ابحث عن مقطع أو آية'
  const query = state.query ? escape(state.query).replace(/[0-9٠-٩]+/g, digits => number(digits)) : `<span class="placeholder">${placeholder}</span>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${model.width}" height="${page.height}" viewBox="0 0 ${model.width} ${page.height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" class="pane${model.theme ? ` theme-${model.theme}` : ''}" dir="rtl"><style>${tajawalFontFaceCss()}${paletteCss('.pane', model.color)}${ORNAMENT_CSS}
*{box-sizing:border-box}.pane{position:relative;width:100%;height:100%;background:transparent;border:0;overflow:hidden;color:var(--q-text);font-family:Tajawal,sans-serif;font-weight:400;direction:rtl;text-align:right;user-select:none}.list-title{position:absolute;right:20px;left:100px;top:15px;height:36px;display:flex;align-items:center;font-size:20px;font-weight:700;color:var(--q-title)}.back{position:absolute;left:${LIST_BACK.x}px;top:${LIST_BACK.y}px;width:${LIST_BACK.width}px;height:${LIST_BACK.height}px;border:1px solid var(--q-line);border-radius:8px;display:grid;place-items:center;font-size:14px;color:var(--q-soft);${state.hover === -2 ? 'background:var(--q-hot)' : ''}}.list-page{position:absolute;left:20px;right:20px;top:90px;bottom:12px;border:1px solid var(--q-line);border-radius:10px;background:var(--q-dropdown-bg);}.search{position:absolute;left:28px;right:28px;top:98px;height:38px;padding:9px 10px;border:1px solid var(--q-line);border-radius:7px;background:var(--q-search-bg);font-size:14px;white-space:nowrap;overflow:hidden}.placeholder{color:var(--q-dim)}.caret{color:var(--q-accent)}.rows{position:absolute;left:26px;right:26px;top:${page.rowsTop}px}.rows>div{height:${page.rowHeight}px;padding:${page.rowHeight < ROW_HEIGHT ? '0' : '8px'} 10px;border-radius:5px;display:flex;gap:8px;align-items:center;justify-content:space-between;font-size:14px;white-space:nowrap;overflow:hidden}.rows>div>span{overflow:hidden;text-overflow:ellipsis}.rows>.hot{background:var(--q-hot)}.rows>.turn{justify-content:center;color:var(--q-accent);font-size:13px}.rows>[aria-selected="true"]{border-right:3px solid var(--q-accent)}.rows i{font-style:normal;color:var(--q-accent)}.rows small{display:block;font-size:10px;color:var(--q-label);line-height:14px}.unavailable-note{position:absolute;left:32px;right:32px;top:${page.rowsBottom}px;height:34px;display:flex;align-items:center;gap:4px;color:var(--q-dim);font-size:12px;pointer-events:none}.no-results{height:${page.rowHeight}px;padding:8px 10px;color:var(--q-dim);font-size:13px}bdi{unicode-bidi:isolate;direction:ltr}
</style><div class="list-title">${listTitle(list)}</div><div class="back" role="button" aria-label="رجوع">رجوع</div>${ornament(65, 20)}<div class="list-page"></div><div class="search" role="searchbox">${query}<span class="caret">│</span></div><div class="rows" role="listbox" aria-label="${listTitle(list)}">${prev}${rows || '<div class="no-results">لا توجد نتائج</div>'}${next}</div>${page.note ? `<div class="unavailable-note">${escape(page.note).replace(/[٠-٩]+/g, digits => number(digits))}</div>` : ''}</div></foreignObject></svg>`
}

export type PickMessage = { act: 'pick'; list: List; value: string }
export function isPickMessage(value: unknown): value is PickMessage {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  return m.act === 'pick' && (m.list === 'reciter' || m.list === 'surah' || m.list === 'segment') && typeof m.value === 'string' && (m.list === 'reciter' ? /^\d+:\d+$/.test(m.value) : /^\d+$/.test(m.value))
}

// A page transition requests the site's start once; it carries no wheel or viewport data.
export type PickerMessage = { act: 'picker'; list: List | null; focusRevision: number }
export function isPickerMessage(value: unknown): value is PickerMessage {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  return m.act === 'picker' && (m.list === null || m.list === 'reciter' || m.list === 'surah' || m.list === 'segment') && Number.isInteger(m.focusRevision) && (m.focusRevision as number) >= 0
}

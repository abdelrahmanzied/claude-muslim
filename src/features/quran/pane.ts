import type { QuranPlaying } from '../../../types/index.d.ts'
import { cardModel, cardSvg, hitTest, type CardAction, type CardModel } from './card.ts'
import { searchReciters, searchSurahs, type Catalog, type Reciter } from './catalog.ts'
import { TAJAWAL_REGULAR_WOFF2, TAJAWAL_BOLD_WOFF2 } from './fonts-embedded.ts'

export const PANE_HEIGHT = 650
export const CARD_TOP = 194
export const VISIBLE_ROWS = 8
export const ROW_HEIGHT = 34
export type List = 'reciter' | 'surah'
export type PaneModel = CardModel & { reciters: Reciter[]; surahs: Catalog['surahs']; selectedReciter: string; selectedSurah: number; focusRevision: number; isFocused: boolean; error: string }
export type PickerState = { open: List | null; query: string; highlight: number; scroll: number; hover: number; focusRevision: number; wasFocused: boolean }
export type Option = { value: string; label: string; number: string; selected: boolean }
export const arabicDigits = (value: number): string => String(value).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]!)
export function paneModel(catalog: Catalog, reciter: Reciter, selected: number, playing: QuranPlaying | null | undefined, now: number, width: number, generation: number, focusRevision: number, isFocused: boolean, error: string | null | undefined): PaneModel {
  return { ...cardModel(catalog, reciter, selected, playing, now, Math.max(240, width), generation), reciters: catalog.reciters, surahs: catalog.surahs, selectedReciter: reciter.key, selectedSurah: selected, focusRevision, isFocused, error: error ?? '' }
}
export const pickerInitial = (model: PaneModel): PickerState => ({ open: null, query: '', highlight: 0, scroll: 0, hover: -1, focusRevision: model.focusRevision, wasFocused: model.isFocused })
export function options(model: PaneModel, list: List, query: string): Option[] {
  return list === 'reciter' ? searchReciters(query, model.reciters).map(r => ({ value: r.key, label: r.label.replace(' — ', ' · '), number: '', selected: r.key === model.selectedReciter }))
    : searchSurahs(query, model.surahs).map(s => ({ value: String(s.id), label: s.name, number: arabicDigits(s.id), selected: s.id === model.selectedSurah }))
}
export const fieldTop = (list: List): number => list === 'reciter' ? 44 : 130
export const overlayTop = (list: List): number => fieldTop(list) + 48
export function moveHighlight(state: PickerState, count: number, delta: number): PickerState {
  const highlight = Math.max(0, Math.min(Math.max(0, count - 1), state.highlight + delta))
  const scroll = Math.max(0, Math.min(Math.max(0, count - VISIBLE_ROWS), highlight < state.scroll ? highlight : highlight >= state.scroll + VISIBLE_ROWS ? highlight - VISIBLE_ROWS + 1 : state.scroll))
  return { ...state, highlight, scroll, hover: -1 }
}
export function typeQuery(state: PickerState, key: string): PickerState {
  const query = key === 'backspace' ? Array.from(state.query).slice(0, -1).join('') : state.query + key
  return { ...state, query: query.slice(0, 120), highlight: 0, scroll: 0, hover: -1 }
}
export type PaneHit = { act: 'field'; list: List } | { act: 'row'; index: number } | { act: 'panel' } | { act: 'close' } | { act: 'control'; action: CardAction } | null
export function paneHit(model: PaneModel, state: PickerState, x: number, y: number): PaneHit {
  if (![x, y].every(Number.isFinite)) return null
  // Open overlay owns its pixels; it must never click the player beneath it.
  if (state.open) {
    const top = overlayTop(state.open)
    if (x >= 20 && x <= model.width - 20 && y >= top && y < top + 348) {
      const row = Math.floor((y - top - 56) / ROW_HEIGHT)
      const count = options(model, state.open, state.query).length
      if (row >= 0 && row < VISIBLE_ROWS && state.scroll + row < count) return { act: 'row', index: state.scroll + row }
      return { act: 'panel' }
    }
  }
  for (const list of ['reciter', 'surah'] as const) if (x >= 20 && x <= model.width - 20 && y >= fieldTop(list) && y <= fieldTop(list) + 42) return { act: 'field', list }
  if (state.open) return { act: 'close' }
  const action = hitTest(model.width - 40, x - 20, y - CARD_TOP)
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
  const fields = (['reciter', 'surah'] as const).map(list => {
    const label = list === 'reciter' ? 'القارئ' : 'السورة'
    const value = list === 'reciter' ? escape(selected.label.replace(' — ', ' · ')) : `${number(arabicDigits(model.selectedSurah))} · ${escape(model.surahs[model.selectedSurah - 1]!.name)}`
    return `<div class="field-label" style="top:${fieldTop(list) - 22}px">${label}</div><div class="field" role="combobox" aria-expanded="${state.open === list}" style="top:${fieldTop(list)}px"><span class="value">${value}</span><span class="arrow">▾</span></div>`
  }).join('')
  let dropdown = ''
  if (state.open) {
    const matches = options(model, state.open, state.query)
    const rows = matches.slice(state.scroll, state.scroll + VISIBLE_ROWS).map((o, i) => `<div class="option ${o.selected ? 'selected' : ''} ${state.highlight === state.scroll + i || state.hover === state.scroll + i ? 'hot' : ''}" role="option" aria-selected="${o.selected}" style="top:${56 + i * ROW_HEIGHT}px"><span>${o.number ? `${number(o.number)} · ` : ''}${escape(o.label)}</span><span class="check">${o.selected ? '✓' : ''}</span></div>`).join('')
    const placeholder = state.open === 'reciter' ? 'ابحث عن قارئ' : 'ابحث عن سورة أو رقمها'
    dropdown = `<div class="dropdown" style="top:${overlayTop(state.open)}px"><div class="search" role="searchbox">${state.query ? escape(state.query).replace(/[0-9٠-٩]+/g, digits => number(digits)) : `<span class="placeholder">${placeholder}</span>`}<span class="caret">│</span></div>${rows}${!matches.length ? '<div class="no-results">لا توجد نتائج</div>' : ''}<div class="more">${state.scroll > 0 ? '↑ ' : ''}${state.scroll + VISIBLE_ROWS < matches.length ? '↓ المزيد · ' : ''}${matches.length ? `${number(arabicDigits(state.highlight + 1))} / ${number(arabicDigits(matches.length))}` : ''}</div></div>`
  }
  const player = cardSvg({ ...model, width: model.width - 40 }, hover)
  const fonts = `@font-face{font-family:Tajawal;font-weight:400;src:url(data:font/woff2;base64,${TAJAWAL_REGULAR_WOFF2}) format('woff2')}@font-face{font-family:Tajawal;font-weight:700;src:url(data:font/woff2;base64,${TAJAWAL_BOLD_WOFF2}) format('woff2')}`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${model.width}" height="${PANE_HEIGHT}" viewBox="0 0 ${model.width} ${PANE_HEIGHT}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" class="pane" dir="rtl"><style>${fonts}
*{box-sizing:border-box}.pane{position:relative;width:100%;height:100%;background:#1e1d1b;color:#e9e6df;font-family:Tajawal,sans-serif;font-weight:400;direction:rtl;text-align:right;user-select:none}.field-label{position:absolute;right:20px;left:20px;font-size:12px;color:#8a857c;line-height:18px}.field{position:absolute;left:20px;right:20px;height:42px;border:1px solid #3a3734;border-radius:8px;background:#232120;padding:10px 12px;font-size:14px;display:flex;align-items:center;justify-content:space-between;gap:10px}.field .value{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.arrow{color:#6f6a62}.player{position:absolute;left:20px;top:${CARD_TOP}px}.pane .quran{font-family:Tajawal,sans-serif;font-weight:400;text-align:right;direction:rtl}.pane .title{font-weight:700}.pane .time{font-family:Tajawal,sans-serif;font-variant-numeric:tabular-nums;direction:ltr;text-align:left}.dropdown{position:absolute;left:20px;right:20px;height:348px;border:1px solid #3a3734;border-radius:10px;background:#232120;z-index:5;box-shadow:0 10px 30px #0008;overflow:hidden}.search{position:absolute;left:8px;right:8px;top:8px;height:38px;padding:9px 10px;border:1px solid #3a3734;border-radius:7px;background:#1e1d1b;font-size:14px;white-space:nowrap;overflow:hidden}.placeholder{color:#8a857c}.caret{color:#7fc3a0}.option{position:absolute;left:6px;right:6px;height:${ROW_HEIGHT}px;padding:8px 10px;border-radius:5px;display:flex;gap:8px;align-items:center;justify-content:space-between;font-size:14px;white-space:nowrap;overflow:hidden}.option>span:first-child{overflow:hidden;text-overflow:ellipsis}.option.hot{background:#2f4a3c}.option.selected{border-right:3px solid #7fc3a0}.check{color:#7fc3a0}.more{position:absolute;bottom:5px;right:12px;left:12px;color:#8a857c;font-size:11px;height:16px;text-align:center}.no-results{position:absolute;top:64px;right:18px;color:#8a857c;font-size:13px}.error{position:absolute;top:602px;left:20px;right:20px;font-size:12px;color:#8a857c}bdi{unicode-bidi:isolate;direction:ltr}
</style>${fields}<div class="player">${player}</div>${model.error ? `<div class="error">${escape(model.error)}</div>` : ''}${dropdown}</div></foreignObject></svg>`
}

export type PickMessage = { act: 'pick'; list: List; value: string }
export function isPickMessage(value: unknown): value is PickMessage {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  return m.act === 'pick' && (m.list === 'reciter' || m.list === 'surah') && typeof m.value === 'string' && (m.list === 'reciter' ? /^\d+:\d+$/.test(m.value) : /^\d+$/.test(m.value))
}

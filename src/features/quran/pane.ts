import type { QuranPlaying, QuranRepeat } from '../../../types/index.d.ts'
import { cardModel, type CardModel, type TrackSelection } from './card.ts'
import { isAvailable, nearestAvailable, nextAvailable } from './availability.ts'
import { formatTime } from './player.ts'
import { normalizeName, searchReciters, searchSurahs, type Catalog, type Reciter } from './catalog.ts'
import { arabicDigits, segmentLabel } from './label.ts'
export { arabicDigits }

export const PANE_MIN_WIDTH = 240
export const PANE_MAX_WIDTH = 1200
// A card reporting zero, undefined or non-finite sizes must never reach the model.
export const safeWidth = (width: unknown, fallback = 480): number => typeof width === 'number' && Number.isFinite(width) && width > 0 ? Math.max(PANE_MIN_WIDTH, Math.min(PANE_MAX_WIDTH, Math.round(width))) : fallback
export type List = 'reciter' | 'surah' | 'segment'
export type PaneModel = CardModel & { reciters: Reciter[]; surahs: Catalog['surahs']; selectedReciter: string; selectedSurah: number; focusRevision: number; isFocused: boolean; error: string; selection?: TrackSelection }
export type Option = { value: string; label: string; number: string; selected: boolean; detail?: string }
export function paneModel(catalog: Catalog, reciter: Reciter, selected: number, playing: QuranPlaying | null | undefined, now: number, width: number, generation: number, focusRevision: number, isFocused: boolean, error: string | null | undefined, selection?: TrackSelection, repeat: QuranRepeat = 'off'): PaneModel {
  selected = nearestAvailable(reciter.key, selected) ?? selected
  const card = cardModel(catalog, reciter, selected, playing, now, safeWidth(width, PANE_MIN_WIDTH), generation, selection, repeat)
  const next = nextAvailable(reciter.key, selected, 1)
  const index = playing?.segmentIndex ?? selection?.selectedSegment ?? 0
  const segment = selection?.segments[index]
  if (card.repeat === 'off' && (!segment || index === selection!.segments.length - 1) && next !== null) card.next = `التالي تلقائي: ${catalog.surahs[next - 1]!.name}`
  card.canPrev = !!(segment && index > 0) || nextAvailable(reciter.key, selected, -1) !== null
  card.canNext = !!(segment && index < selection!.segments.length - 1) || nextAvailable(reciter.key, selected, 1) !== null
  return { ...card, selection, reciters: catalog.reciters, surahs: catalog.surahs, selectedReciter: reciter.key, selectedSurah: selected, focusRevision, isFocused, error: error ?? '' }
}
export function options(model: PaneModel, list: List, query: string): Option[] {
  if (list === 'segment') {
    const segments = model.selection?.segments ?? []
    // A number searches the quarter and the ayat the segment holds, as the label shows them.
    const q = normalizeName(query.replace(/[0-9]/g, d => arabicDigits(Number(d))), false), digits = query.trim().replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
    return segments.map((s, i) => ({ value: String(i), label: segmentLabel(segments, i), number: arabicDigits(i + 1), detail: formatTime(s.durationMs), selected: i === model.selection?.selectedSegment }))
      .filter((o, i) => /^\d+$/.test(digits) ? Number(digits) === segments[i]!.quarter || Number(digits) >= segments[i]!.firstAyah && Number(digits) <= segments[i]!.lastAyah : normalizeName(o.label, false).includes(q))
  }
  return list === 'reciter' ? searchReciters(query, model.reciters).map(r => ({ value: r.key, label: r.label.replace(' — ', ' · '), number: '', selected: r.key === model.selectedReciter }))
    : searchSurahs(query, model.surahs).filter(s => isAvailable(model.selectedReciter, s.id)).map(s => ({ value: String(s.id), label: s.name, number: arabicDigits(s.id), selected: s.id === model.selectedSurah }))
}
export type PickMessage = { act: 'pick'; list: List; value: string }
export function isPickMessage(value: unknown): value is PickMessage {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  return m.act === 'pick' && (m.list === 'reciter' || m.list === 'surah' || m.list === 'segment') && typeof m.value === 'string' && (m.list === 'reciter' ? /^\d+:\d+$/.test(m.value) : /^\d+$/.test(m.value))
}

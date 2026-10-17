import type { Accent } from '../../shared/color/index.ts'
import type { QuranPlaying, QuranRepeat } from '../../../types/index.d.ts'
import type { Catalog, Reciter } from './catalog.ts'
import type { Segment } from './segments.ts'
import { segmentLabel } from './label.ts'
import { formatTime } from './player.ts'

export type CardModel = { width: number; playing: boolean; repeat: QuranRepeat; avatarElapsedMs: number; status: string; title: string; reciter: string; elapsed: string; total: string; progress: number; next: string; generation: number; segmentLabel?: string; segmented?: boolean; canNext?: boolean; canPrev?: boolean; preparing?: boolean; theme?: 'light' | 'dark'; color?: Accent }
export type TrackSelection = { segments: Segment[]; selectedSegment: number; durationMs: number | null; loading: 'checking' | 'preparing' | null }
export function cardModel(catalog: Catalog, reciter: Reciter, selected: number, playing: QuranPlaying | null | undefined, now: number, width: number, generation: number, selection?: TrackSelection, repeat: QuranRepeat = 'off'): CardModel {
  const surah = playing?.surah ?? selected
  const active = playing ? catalog.reciters.find(r => r.key === playing.moshafKey) ?? reciter : reciter
  const elapsed = playing ? Math.max(0, now - playing.startedAt) : 0
  const index = playing?.segmentIndex ?? selection?.selectedSegment ?? 0
  const segment = selection?.segments[index]
  const duration = playing?.durationMs ?? segment?.durationMs ?? selection?.durationMs ?? null
  // Quarter repeat means nothing for a whole surah: it reads as off.
  if (repeat === 'segment' && !segment) repeat = 'off'
  return {
    width: Math.max(180, Math.min(1200, Math.round(width))), playing: !!playing, repeat, avatarElapsedMs: elapsed,
    status: playing ? 'يتلى الآن' : selection?.loading === 'checking' ? 'جارٍ فحص حجم التسجيل' : selection?.loading === 'preparing' ? 'جارٍ تجهيز المقطع' : 'متوقف', title: `سورة ${catalog.surahs[surah - 1]!.name}`,
    reciter: `${active.name} · حفص عن عاصم`, elapsed: formatTime(elapsed), total: formatTime(duration),
    progress: duration !== null && duration > 0 ? Math.max(0, Math.min(1, elapsed / duration)) : 0,
    segmentLabel: segment ? segmentLabel(selection!.segments, index) : '',
    segmented: !!segment, canPrev: segment && index > 0 || surah > 1, canNext: segment && index < selection!.segments.length - 1 || surah < 114, preparing: !!selection?.loading,
    // 'surah' repeat covers the whole surah: quarters still advance, then it starts over; 'segment' replays this quarter.
    next: repeat === 'segment' && segment ? `تكرار: ${segmentLabel(selection!.segments, index)}` : segment && index < selection!.segments.length - 1 ? `التالي: ${catalog.surahs[surah - 1]!.name} · ${segmentLabel(selection!.segments, index + 1)}` : repeat === 'surah' ? `تكرار: سورة ${catalog.surahs[surah - 1]!.name}` : surah < 114 ? `التالي تلقائي: ${catalog.surahs[surah]!.name}` : 'بعد سورة الناس يتوقف التشغيل', generation,
  }
}

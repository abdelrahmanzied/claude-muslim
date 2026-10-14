import { accentHex, type Accent } from '../../shared/color/index.ts'
import type { QuranPlaying, QuranRepeat } from '../../../types/index.d.ts'
import type { Catalog, Reciter } from './catalog.ts'
import { avatarSvg } from './avatar.ts'
import type { Segment } from './segments.ts'
import { formatTime } from './player.ts'

export const CARD_HEIGHT = 446
export type CardAction = 'prev' | 'toggle' | 'next' | 'repeat' | 'repeat-segment' | 'retry'
export type CardModel = { width: number; playing: boolean; repeat: QuranRepeat; avatarElapsedMs: number; status: string; title: string; reciter: string; elapsed: string; total: string; progress: number; next: string; generation: number; segmentLabel?: string; segmented?: boolean; canNext?: boolean; canPrev?: boolean; preparing?: boolean; theme?: 'light' | 'dark'; color?: Accent }
export type TrackSelection = { segments: Segment[]; selectedSegment: number; durationMs: number | null; loading: 'checking' | 'preparing' | null }
const digits = (n: number) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]!)
const segmentLabel = (segment: Segment, index: number) => `المقطع ${digits(index + 1)} · الآيات ${digits(segment.firstAyah)}–${digits(segment.lastAyah)}`
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
    segmentLabel: segment ? segmentLabel(segment, index) : '',
    segmented: !!segment, canPrev: segment && index > 0 || surah > 1, canNext: segment && index < selection!.segments.length - 1 || surah < 114, preparing: !!selection?.loading,
    // 'surah' repeat covers the whole surah: quarters still advance, then it starts over; 'segment' replays this quarter.
    next: repeat === 'segment' && segment ? `تكرار: ${segmentLabel(segment, index)}` : segment && index < selection!.segments.length - 1 ? `التالي: ${catalog.surahs[surah - 1]!.name} · المقطع ${digits(index + 2)} · الآيات ${digits(selection!.segments[index + 1]!.firstAyah)}–${digits(selection!.segments[index + 1]!.lastAyah)}` : repeat === 'surah' ? `تكرار: سورة ${catalog.surahs[surah - 1]!.name}` : surah < 114 ? `التالي تلقائي: ${catalog.surahs[surah]!.name}` : 'بعد سورة الناس يتوقف التشغيل', generation,
  }
}
export const CONTROLS_Y = 287
// Selected design: prev, play, next in a centered LTR row; quarter repeat takes the outer left slot and surah repeat the outer right one.
export const controls = (width: number) => {
  const s = Math.min(1, (width - 4) / 259), c = width / 2
  return [
    { action: 'prev' as const, x: c - 62.5 * s, y: CONTROLS_Y, radius: 20 * s },
    { action: 'toggle' as const, x: c, y: CONTROLS_Y, radius: 29.5 * s },
    { action: 'next' as const, x: c + 62.5 * s, y: CONTROLS_Y, radius: 20 * s },
    { action: 'repeat' as const, x: c + 112.5 * s, y: CONTROLS_Y, radius: 17 * s },
    { action: 'repeat-segment' as const, x: c - 112.5 * s, y: CONTROLS_Y, radius: 17 * s },
  ]
}
export function hitTest(width: number, x: number, y: number): CardAction | null {
  if (![width, x, y].every(Number.isFinite) || width < 180 || width > 1200) return null
  return controls(width).find(b => (x - b.x) ** 2 + (y - b.y) ** 2 <= b.radius ** 2 + 1e-8)?.action ?? null
}
export function pointerPixels(width: number, x: number, y: number, columns: number, rows: number, height = CARD_HEIGHT) {
  return { x: x * width / columns, y: y * height / rows }
}
export type CardMessage = { act: 'pointer'; x: number; y: number; columns: number; rows: number; width: number; generation: number; button: string } | { act: 'size'; columns: number; rows: number } | { act: 'key'; key: string }
export function isCardMessage(value: unknown): value is CardMessage {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  if (m.act === 'key') return typeof m.key === 'string'
  if (m.act === 'size') return typeof m.columns === 'number' && Number.isFinite(m.columns) && typeof m.rows === 'number' && Number.isFinite(m.rows)
  return m.act === 'pointer' && ['x', 'y', 'columns', 'rows', 'width', 'generation'].every(k => typeof m[k] === 'number' && Number.isFinite(m[k])) && (m.columns as number) > 0 && (m.rows as number) > 0 && typeof m.button === 'string'
}
export type Theme = 'light' | 'dark'
const DARK_VARS = '--q-bg:transparent;--q-text:#ece9e2;--q-title:#ece9e2;--q-muted:#98948b;--q-dim:#98948b;--q-field-bg:#252321;--q-line:#393733;--q-soft:#b9d9c7;--q-label:#b9d9c7;--q-track:#393733;--q-control-border:#393733;--q-icon:#b9d9c7;--q-on-primary:#ffffff;--q-hover-bg:#202d26;--q-dropdown-bg:#252321;--q-search-bg:#1c1b19;--q-shadow:0 10px 30px #0008;--q-hot:#202d26;--q-scrollbar:#393733'
const LIGHT_VARS = '--q-bg:transparent;--q-text:#302f2a;--q-title:#302f2a;--q-muted:#79766c;--q-dim:#79766c;--q-field-bg:#f9f7f2;--q-line:#d9d6cd;--q-soft:#4c6c55;--q-label:#4c6c55;--q-track:#d9d6cd;--q-control-border:#d9d6cd;--q-icon:#4c6c55;--q-on-primary:#ffffff;--q-hover-bg:#e5eee5;--q-dropdown-bg:#fdfcf9;--q-search-bg:#f5f3ee;--q-shadow:0 10px 30px rgba(48,47,42,.14);--q-hot:#e5eee5;--q-scrollbar:#d9d6cd'
// Colors live here only: dark by default, light under the app's color scheme, or forced by theme-light / theme-dark.
const palette = (color: Accent, isDark: boolean): string => {
  const accent = accentHex(color, isDark)
  return `${isDark ? DARK_VARS : LIGHT_VARS};--q-accent:${accent};--q-hover-border:${accent};--q-primary-hover:${accent};--q-ornament-dim:${accent}`
}
export const paletteCss = (root: string, color: Accent = 'orange'): string => `${root}{${palette(color, true)}}@media (prefers-color-scheme: light){${root}{${palette(color, false)}}}${root}.theme-light{${palette(color, false)}}${root}.theme-dark{${palette(color, true)}}`
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
// The selected design's rosette rule, drawn at the top of the pane and above the "next" line.
export const ORNAMENT_CSS = '.orn{position:absolute;display:flex;gap:10px;align-items:center;justify-content:center;height:25px;color:var(--q-accent)}.orn .arm{flex:1;height:1px;opacity:.8}.orn .a1{background:linear-gradient(to right,transparent,var(--q-ornament-dim))}.orn .a2{background:linear-gradient(to left,transparent,var(--q-ornament-dim))}.orn svg{width:28px;height:28px;flex:none;fill:none;stroke:currentColor;stroke-width:1.25}'
export const ornament = (top: number, inset = 0): string => `<div class="orn" aria-hidden="true" style="top:${top}px;left:${inset}px;right:${inset}px"><span class="arm a1"></span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="m20 4 4 6 7-1 1 7 5 4-5 4-1 7-7-1-4 6-4-6-7 1-1-7-5-4 5-4 1-7 7 1Z"/><path d="m20 11 9 9-9 9-9-9Z"/><circle cx="20" cy="20" r="3"/></svg><span class="arm a2"></span></div>`
const icon = (action: CardAction, playing: boolean) => {
  const arrows = '<path d="m17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3"/>'
  const shape = action === 'repeat' ? arrows : action === 'repeat-segment' ? `${arrows}<path d="M11 10h1v4"/>` : action === 'toggle' ? playing ? '<rect x="5" y="5" width="14" height="14" rx="2"/>' : '<path d="m7 4 14 8-14 8Z"/>'
    : action === 'prev' ? '<path d="M5 5v14M19 5 8 12l11 7Z"/>' : '<path d="M19 5v14M5 5l11 7-11 7Z"/>'
  const size = action === 'toggle' ? 20 : action === 'repeat' || action === 'repeat-segment' ? 17 : 18
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${action === 'toggle' ? 'currentColor' : 'none'}" stroke="${action === 'toggle' ? 'none' : 'currentColor'}" stroke-width="${action === 'repeat' || action === 'repeat-segment' ? 1.5 : 1.7}" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`
}
export function cardSvg(model: CardModel, hover: CardAction | null = null): string {
  const width = model.width, s = Math.min(1, (width - 4) / 259)
  const avatarSize = width > 330 ? 120 : Math.min(95, Math.max(48, (width - 36) * 0.35))
  const busy = model.playing || !!model.preparing
  const buttons = controls(width).map(b => {
    const label = b.action === 'repeat' ? 'تكرار السورة' : b.action === 'repeat-segment' ? 'تكرار المقطع' : b.action === 'toggle' ? busy ? 'إيقاف' : 'تشغيل' : b.action === 'prev' ? model.segmented ? 'المقطع السابق' : 'السابقة' : model.segmented ? 'المقطع التالي' : 'التالية'
    const caption = b.action === 'repeat' ? 'السورة' : b.action === 'repeat-segment' ? 'المقطع' : b.action === 'toggle' ? label : b.action === 'prev' ? 'السابق' : 'التالي'
    const disabled = b.action === 'prev' && model.canPrev === false || b.action === 'next' && model.canNext === false || b.action === 'repeat-segment' && !model.segmented
    const pressed = b.action === 'repeat' && model.repeat === 'surah' || b.action === 'repeat-segment' && model.repeat === 'segment'
    const top = b.y + b.radius + (b.action === 'repeat' || b.action === 'repeat-segment' ? 8 : 9)
    return `<div class="control ${b.action === 'toggle' || pressed ? 'primary' : ''} ${hover === b.action ? 'hover' : ''}" role="button" aria-label="${label}" aria-disabled="${disabled}"${b.action === 'repeat' || b.action === 'repeat-segment' ? ` aria-pressed="${pressed}"` : ''} style="left:${b.x - b.radius}px;top:${b.y - b.radius}px;width:${b.radius * 2}px;height:${b.radius * 2}px">${icon(b.action, busy)}</div><div class="label" style="left:${b.x - 32 * s}px;width:${64 * s}px;top:${top}px;font-size:${Math.max(9, 10 * s)}px">${caption}</div>`
  }).join('')
  const titleSize = width > 330 ? 30 : width > 240 ? 25 : 22
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${CARD_HEIGHT}" viewBox="0 0 ${width} ${CARD_HEIGHT}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" dir="rtl" class="quran${model.theme ? ` theme-${model.theme}` : ''}"><style>${paletteCss('.quran', model.color)}${ORNAMENT_CSS}
*{box-sizing:border-box}.quran{width:100%;height:100%;font-family:Tajawal,sans-serif;color:var(--q-title);user-select:none}.card{position:relative;height:${CARD_HEIGHT}px}.top{position:absolute;left:0;right:0;top:12px;height:125px;display:flex;align-items:center;justify-content:space-between;gap:8px}.info{min-width:0;flex:1}.status{display:flex;align-items:center;gap:6px;margin-bottom:12px;font-size:12px;color:var(--q-accent);line-height:18px}.status i{width:5px;height:5px;border-radius:50%;background:currentColor;flex:none}.title{font-size:${titleSize}px;font-weight:700;line-height:1.45;max-height:88px;overflow:hidden;color:var(--q-title)}.segment{margin-top:6px;font-size:11px;color:var(--q-soft);line-height:1.7}.avatar{flex:none;width:${avatarSize}px;height:${avatarSize * 30 / 32}px}.credit{position:absolute;left:0;right:0;top:149px;height:23px;font-size:13px;color:var(--q-soft);line-height:23px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.track{position:absolute;left:0;right:0;top:192px;height:5px;border-radius:5px;background:var(--q-track);overflow:hidden}.fill{position:absolute;left:0;top:0;height:100%;border-radius:5px;background:var(--q-accent)}.time{position:absolute;left:0;right:0;top:210px;display:flex;justify-content:space-between;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;color:var(--q-soft);line-height:21px;direction:ltr}.control{position:absolute;border:1px solid var(--q-control-border);border-radius:50%;display:grid;place-items:center;background:transparent;color:var(--q-icon)}.control[aria-disabled="true"]{opacity:.35}.control.primary{background:var(--q-accent);border-color:var(--q-accent);color:var(--q-on-primary)}.control.hover{border-color:var(--q-hover-border);background:var(--q-hover-bg)}.control.primary.hover{background:var(--q-primary-hover)}.label{position:absolute;text-align:center;color:var(--q-label);line-height:15px;white-space:nowrap}.hint{position:absolute;left:0;right:0;top:233px;font-size:11px;line-height:16px;color:var(--q-dim)}.next{position:absolute;left:0;right:0;top:405px;max-height:40px;overflow:hidden;font-size:12px;color:var(--q-dim);line-height:20px}
</style><div class="card"><div class="top"><div class="info"><div class="status"><i></i><span>${model.status}</span></div><div class="title">${escape(model.title)}</div>${model.segmentLabel ? `<div class="segment">${escape(model.segmentLabel)}</div>` : ''}</div><div class="avatar">${avatarSvg(model.playing, model.avatarElapsedMs, avatarSize)}</div></div><div class="credit">${escape(model.reciter)}</div><div class="track"><div class="fill" style="width:${model.progress * 100}%"></div></div><div class="time" dir="ltr"><span>${model.elapsed}</span><span>${model.total}</span></div><div class="hint">الوقت تقريبي</div>${buttons}${ornament(369)}${model.next ? `<div class="next">${escape(model.next)}</div>` : ''}</div></div></foreignObject></svg>`
}

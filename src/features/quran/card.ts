import type { QuranPlaying } from '../../../types/index.d.ts'
import type { Catalog, Reciter } from './catalog.ts'
import { formatTime } from './player.ts'

export const CARD_HEIGHT = 382
export const PANEL_HEIGHT = 326
export type CardAction = 'prev' | 'toggle' | 'next'
export type CardModel = { width: number; playing: boolean; status: string; title: string; reciter: string; elapsed: string; total: string; progress: number; next: string; generation: number }
export function cardModel(catalog: Catalog, reciter: Reciter, selected: number, playing: QuranPlaying | null | undefined, now: number, width: number, generation: number): CardModel {
  const surah = playing?.surah ?? selected
  const active = playing ? catalog.reciters.find(r => r.key === playing.moshafKey) ?? reciter : reciter
  const elapsed = playing ? Math.max(0, now - playing.startedAt) : 0
  const duration = playing?.durationMs ?? null
  return {
    width: Math.max(180, Math.min(1200, Math.round(width))), playing: !!playing,
    status: playing ? 'يتلى الآن' : 'متوقف', title: `سورة ${catalog.surahs[surah - 1]!.name}`,
    reciter: `${active.name} · حفص عن عاصم`, elapsed: formatTime(elapsed), total: formatTime(duration),
    progress: duration !== null && duration > 0 ? Math.max(0, Math.min(1, elapsed / duration)) : 0,
    next: playing ? surah < 114 ? `التالي تلقائي: ${catalog.surahs[surah]!.name}` : 'بعد سورة الناس يتوقف التشغيل' : '', generation,
  }
}
export const controls = (width: number) => [
  { action: 'prev' as const, x: width / 2 + 65, y: 250, radius: 23 },
  { action: 'toggle' as const, x: width / 2, y: 250, radius: 28 },
  { action: 'next' as const, x: width / 2 - 65, y: 250, radius: 23 },
]
export function hitTest(width: number, x: number, y: number): CardAction | null {
  if (![width, x, y].every(Number.isFinite) || width < 180 || width > 1200) return null
  return controls(width).find(b => (x - b.x) ** 2 + (y - b.y) ** 2 <= b.radius ** 2)?.action ?? null
}
export function pointerPixels(width: number, x: number, y: number, columns: number, rows: number) {
  return { x: x * width / columns, y: y * CARD_HEIGHT / rows }
}
export type CardMessage = { act: 'pointer'; x: number; y: number; columns: number; rows: number; width: number; generation: number; button: string } | { act: 'size'; columns: number; rows: number } | { act: 'key'; key: string }
export function isCardMessage(value: unknown): value is CardMessage {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  if (m.act === 'key') return typeof m.key === 'string'
  if (m.act === 'size') return typeof m.columns === 'number' && Number.isFinite(m.columns) && typeof m.rows === 'number' && Number.isFinite(m.rows)
  return m.act === 'pointer' && ['x', 'y', 'columns', 'rows', 'width', 'generation'].every(k => typeof m[k] === 'number' && Number.isFinite(m[k])) && (m.columns as number) > 0 && (m.rows as number) > 0 && typeof m.button === 'string'
}
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const icon = (action: CardAction, playing: boolean) => {
  const shape = action === 'toggle' ? playing ? '<rect x="5" y="5" width="14" height="14" rx="2"/>' : '<path d="M7 4l13 8-13 8z"/>'
    : action === 'prev' ? '<path d="M5 5l9 7-9 7z M19 5v14"/>' : '<path d="M19 5l-9 7 9 7z M5 5v14"/>'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${action === 'toggle' ? '#13201a' : 'none'}" stroke="${action === 'toggle' ? 'none' : '#cfe6d9'}" stroke-width="2">${shape}</svg>`
}
export function cardSvg(model: CardModel, hover: CardAction | null = null): string {
  const buttons = controls(model.width).map(b => {
    const label = b.action === 'toggle' ? model.playing ? 'إيقاف' : 'تشغيل' : b.action === 'prev' ? 'السابقة' : 'التالية'
    return `<div class="control ${b.action === 'toggle' ? 'primary' : ''} ${hover === b.action ? 'hover' : ''}" role="button" aria-label="${label}" style="left:${b.x - b.radius}px;top:${b.y - b.radius}px;width:${b.radius * 2}px;height:${b.radius * 2}px">${icon(b.action, model.playing)}</div><div class="label" style="left:${b.x - 32}px">${label}</div>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${model.width}" height="${CARD_HEIGHT}" viewBox="0 0 ${model.width} ${CARD_HEIGHT}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" dir="rtl" class="quran"><style>
*{box-sizing:border-box}.quran{width:100%;height:100%;font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;color:#f1efe9;user-select:none}.card{position:relative;height:${PANEL_HEIGHT}px;border:1px solid #2f4a3c;border-radius:14px;background:#1f2b25}.status,.title,.reciter,.track,.time,.hint{position:absolute;left:18px;right:18px}.status{top:22px;font-size:12px;color:#7fc3a0;line-height:18px}.title{top:50px;font-size:26px;font-weight:600;line-height:42px}.reciter{top:102px;font-size:13px;color:#b9d8c7;line-height:20px}.track{top:144px;height:6px;border-radius:3px;background:#2f4a3c;overflow:hidden}.fill{position:absolute;right:0;top:0;height:100%;border-radius:3px;background:#7fc3a0}.time{top:165px;display:flex;justify-content:space-between;font-family:'IBM Plex Mono',monospace;font-size:13px;color:#b9d8c7;line-height:20px}.hint{top:191px;font-size:11px;color:#6f9a84}.control{position:absolute;border:1px solid #2f4a3c;border-radius:50%;display:grid;place-items:center;background:transparent}.control.primary{background:#7fc3a0;border-color:#7fc3a0}.control.hover{border-color:#a6dcbf;background:#2f4a3c}.control.primary.hover{background:#a6dcbf}.label{position:absolute;top:286px;width:64px;text-align:center;font-size:11px;color:#8fb8a3;line-height:18px}.next{margin-top:16px;padding-top:12px;border-top:1px solid #2c2a28;font-size:12px;color:#8a857c;line-height:20px}
</style><div class="card"><div class="status">${model.status}</div><div class="title">${escape(model.title)}</div><div class="reciter">${escape(model.reciter)}</div><div class="track"><div class="fill" style="width:${model.progress * 100}%"></div></div><div class="time" dir="ltr"><span>${model.elapsed}</span><span>${model.total}</span></div><div class="hint">الوقت تقريبي</div>${buttons}</div>${model.next ? `<div class="next">${escape(model.next)}</div>` : ''}</div></foreignObject></svg>`
}

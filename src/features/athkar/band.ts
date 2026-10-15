import { ACCENTS, accentHex, type Accent } from '../../shared/color/index.ts'
import { BAND_CSS, QUESTION_CSS } from './band-css.ts'
import type { Period } from './data.ts'
import { AREF_RUQAA_BOLD, TAJAWAL_BOLD, TAJAWAL_REGULAR } from './fonts.ts'
import type { Sky } from './logic.ts'
import type { ReaderProps, Style } from './look.ts'
import { SIZE_DEFAULT } from '../../config.ts'
import { CARD_BORDER_PX, CARD_FOOT, CARD_LINE, CARD_TOP, cardArea, cardHeight, cardHtml, cardSvg, closeArea as cardClose, fontFace, frameOf as cardFrame, pixelOf as cardPixel, type CardFrame } from '../../shared/card/card.ts'
import { END_CITE_CHAR, END_CITE_EM, END_VERSE_CHAR, HINT_CHAR, TEXT_WIDTH } from './metrics.ts'

// The desktop band: the athkar lab's band, drawn as HTML and CSS inside one
// SVG document (an interactive Svg runs CSS animation; no script). Clicks and
// keys are caught by the Client drawn over it.

export type Phase = 'cover' | 'reading' | 'question' | 'done'

export type BandModel = {
  // The text's size in pixels; SIZE_DEFAULT when absent.
  textSize?: number
  question?: ReaderProps['question']
  phase: Phase
  period: Period
  sky: Sky
  style: Style
  accent: Accent
  isDark: boolean
  // Lit (in color, breathing); faded at rest.
  isActive: boolean
  hasBegun: boolean
  title: string
  thikrId: string
  text: string
  note?: string
  position: string
  count: number
  times: number
  // Overall progress now and before the last change, 0 to 100.
  progress: number
  from: number
  // Just after the set is finished: how far into the finale, in milliseconds.
  // The band stands tall, stars fall and the dua rises; absent, the done row.
  finaleMs?: number
  // How far into its slide the glow is, in milliseconds: a redraw carries it on.
  glowMs?: number
  end: string
  endHint: string
  // Folded, in place of the verse: finished.
  endNote: string
  // When it is drawn, so the sky's motion carries on across redraws.
  now: number
  width: number
  height: number
  // The pointer is over the × (set by the reader, which sees the pointer).
  hoverClose?: boolean
  // The height of the one-line row the reading folds to when faded; absent, it never folds.
  restHeight?: number
  // On the desktop, the cell the band is laid out in (CSS px): the picture
  // reaches a column past the band's slot at the sides and half a line above
  // and below (a margin of -1 each way) to cover the card the desktop draws
  // around it.
  card?: { ch: number; lh: number }
  // Over the card: the width the picture is drawn at, in CSS pixels, a little
  // past the slot so the desktop narrows it to the slot exactly.
  drawWidth?: number
}

// The reading, the cover and the done row fold to one row while faded; a press
// lights them and they open. The finale never folds.
export const isFolded = (m: Pick<BandModel, 'phase' | 'isActive' | 'restHeight' | 'finaleMs'>) =>
  !m.isActive && m.restHeight !== undefined && (m.phase !== 'done' || m.finaleMs === undefined)

// The height the band stands at now: the folded row, or the full band.
export const heightOf = (m: Pick<BandModel, 'phase' | 'isActive' | 'restHeight' | 'height' | 'finaleMs'>) => (isFolded(m) ? (m.restHeight ?? m.height) : m.height)

type Framed = Pick<BandModel, 'width' | 'height' | 'card' | 'drawWidth' | 'phase' | 'isActive' | 'restHeight' | 'finaleMs'>

// The band as the shared card sees it.
export const cardFrameOf = (m: Framed): CardFrame => ({ width: m.width, height: heightOf(m), isFolded: isFolded(m), card: m.card, drawWidth: m.drawWidth })

// The picture's size, and where the band's own box starts in it.
export const frameOf = (m: Framed) => cardFrame(cardFrameOf(m))

// Sunrise is the one bright sky: dark words on it.
const INK: Record<Sky, 'light' | 'dark'> = { dawn: 'light', sunrise: 'dark', day: 'light', rose: 'light', bluehour: 'light', crescent: 'light' }

const SKY_FX: Record<Sky, string> = {
  dawn: '<i class="st" style="left:12%;top:22%;--d:0s;--dur:3.4s;width:2px;height:2px"></i><i class="st" style="left:30%;top:40%;--d:-1.2s;--dur:4.2s;width:1.5px;height:1.5px"></i><i class="st" style="left:47%;top:14%;--d:-2.1s;--dur:3.1s;width:2px;height:2px"></i><i class="st" style="left:63%;top:30%;--d:-0.6s;--dur:4.8s;width:1.5px;height:1.5px"></i><i class="st" style="left:80%;top:18%;--d:-3s;--dur:3.7s;width:2px;height:2px"></i><i class="st" style="left:92%;top:46%;--d:-1.7s;--dur:4.4s;width:1.5px;height:1.5px"></i><i class="sh" style="--d:-1s;--dur:9s"></i><i class="hz dawn"></i>',
  sunrise: '<i class="sun up"></i><i class="cl" style="top:22%;--d:0s;--dur:38s;--sc:1;opacity:0.85"></i><i class="cl" style="top:58%;--d:-14s;--dur:52s;--sc:0.8;opacity:0.55"></i><i class="cl" style="top:36%;--d:-30s;--dur:46s;--sc:1.2;opacity:0.5"></i><i class="bd" style="top:28%;--d:-4s;--dur:30s"><b></b></i><i class="bd" style="top:34%;--d:-6s;--dur:30s"><b></b></i>',
  day: '<i class="rays"></i><i class="cl" style="top:18%;--d:-5s;--dur:42s;--sc:1.1;opacity:0.8"></i><i class="cl" style="top:60%;--d:-20s;--dur:56s;--sc:0.9;opacity:0.6"></i><i class="cl" style="top:38%;--d:-33s;--dur:64s;--sc:1.3;opacity:0.5"></i><i class="bd" style="top:30%;--d:-12s;--dur:34s"><b></b></i>',
  rose: '<i class="sun down"></i><i class="st" style="left:18%;top:16%;--d:0s;--dur:3.6s;width:2px;height:2px"></i><i class="st" style="left:44%;top:26%;--d:-1.4s;--dur:4.4s;width:1.5px;height:1.5px"></i><i class="st" style="left:70%;top:12%;--d:-2.4s;--dur:3.2s;width:2px;height:2px"></i><i class="st" style="left:88%;top:30%;--d:-0.8s;--dur:4.8s;width:1.5px;height:1.5px"></i><i class="haze" style="top:52%;--d:0s;--dur:60s"></i><i class="haze" style="top:72%;--d:-25s;--dur:80s;opacity:.6"></i>',
  bluehour: '<i class="st" style="left:8%;top:18%;--d:0s;--dur:3.2s;width:2px;height:2px"></i><i class="st" style="left:22%;top:40%;--d:-1.1s;--dur:4.6s;width:1.5px;height:1.5px"></i><i class="st" style="left:36%;top:12%;--d:-2.2s;--dur:3.8s;width:2px;height:2px"></i><i class="st" style="left:52%;top:34%;--d:-0.4s;--dur:4.1s;width:1.5px;height:1.5px"></i><i class="st" style="left:66%;top:16%;--d:-2.9s;--dur:3.3s;width:2px;height:2px"></i><i class="st" style="left:78%;top:42%;--d:-1.6s;--dur:4.9s;width:1.5px;height:1.5px"></i><i class="st" style="left:94%;top:24%;--d:-0.9s;--dur:3.6s;width:2px;height:2px"></i><i class="sh" style="--d:-4s;--dur:11s"></i><i class="hz blue"></i>',
  crescent: '<i class="st" style="left:6%;top:30%;--d:0s;--dur:3s;width:2px;height:2px"></i><i class="st" style="left:18%;top:12%;--d:-1.3s;--dur:4.2s;width:1.5px;height:1.5px"></i><i class="st" style="left:30%;top:44%;--d:-2.4s;--dur:3.6s;width:2px;height:2px"></i><i class="st" style="left:42%;top:20%;--d:-0.7s;--dur:4.8s;width:1.5px;height:1.5px"></i><i class="st" style="left:54%;top:36%;--d:-3.1s;--dur:3.2s;width:2px;height:2px"></i><i class="st" style="left:66%;top:10%;--d:-1.9s;--dur:4.4s;width:2px;height:2px"></i><i class="st" style="left:76%;top:40%;--d:-0.3s;--dur:3.8s;width:1.5px;height:1.5px"></i><i class="st" style="left:86%;top:22%;--d:-2.6s;--dur:4.1s;width:2px;height:2px"></i><i class="st" style="left:96%;top:48%;--d:-1s;--dur:3.4s;width:1.5px;height:1.5px"></i><i class="sh" style="--d:-2s;--dur:8s"></i><i class="sh" style="--d:-6s;--dur:13s;top:22%;left:48%"></i>',
}

// The lab page's own colors and fonts, light and dark.
const ROOT_LIGHT = '--desk-bg: #ffffff; --desk-side: #f7f6f2; --desk-ink: #1f1f1f; --desk-dim: #8b8b85; --desk-line: #e6e4dd; --claude-soft: #f8ebe2; --claude-faint: #fcf5f0; --green-soft: #d2ece0; --green-faint: #eef8f3; --yellow-soft: #f6eac8; --yellow-faint: #fdf8ea; --blue-soft: #dbe6f3; --blue-faint: #f1f5fa;'
const ROOT_DARK = '--desk-bg: #1f1e1c; --desk-side: #262522; --desk-ink: #ecebe6; --desk-dim: #8f8d86; --desk-line: #34322e; --claude-soft: #3a2a22; --claude-faint: #2b2420; --green-soft: #133328; --green-faint: #0f231c; --yellow-soft: #3b3018; --yellow-faint: #272114; --blue-soft: #1c2a3d; --blue-faint: #161f2b;'
const FONTS = '--font-band: "Tajawal", sans-serif; --font-ar: "Tajawal", sans-serif; --font-cover: "Aref Ruqaa", "Tajawal", serif; --font-ui: system-ui, -apple-system, "Segoe UI", sans-serif; --font-mono: ui-monospace, Menlo, monospace;'

// The open reading's vertical layout, in CSS pixels: padding above, the room
// kept under the text for the progress line and the pill riding on its head
// (the line sits 4px up and is 2px thick, the pill 14px tall on it), the
// thikr's line-height (times its size), the room left at the text's left for
// the × and the moon, and the width kept at the line's left for the position.
const READ_TOP = CARD_TOP
const READ_FOOT = CARD_FOOT
const READ_LINE = CARD_LINE
const READ_CLEAR = 28
const POS_ROOM = 60
const POS_ROOM_WITH_NOTE = 150
// The pill's half width, which the line keeps it that far from either end.
const PILL_HALF = 20
// The smallest the cover's and done row's one-line words shrink to, to fit the width.
const FIT_MIN = 9
// The wrap and the band's border take 2px each side.
const FRAME_PX = CARD_BORDER_PX

// What the band adds to the lab's rules: it fills the picture, the text is never
// cut (the lab scrolled past three lines), the glow eases from its last value,
// and stars fall at the end.
const EXTRA_CSS = `
.band.line { padding: calc(10px + var(--ay, 0px)) calc(14px + var(--ax, 0px)); }
/* The reading is laid out to fixed numbers (READ_* in this file): the text area
   two lines of the person's size tall with the text centered in it, and under
   it the room for the progress line and the pill on its head. */
.band.band.line.rd:not(.rest) { padding: calc(${READ_TOP}px + var(--ay, 0px)) calc(14px + var(--ax, 0px)) calc(${READ_FOOT}px + var(--ay, 0px)); align-content: start; }
.band.band.line.rd .text { height: var(--th); line-height: ${READ_LINE}; display: grid; align-content: center; padding-left: ${READ_CLEAR}px; }
/* The set's line runs from the position to the right edge; its head carries the pill. */
.band.rd:not(.rest) > .pglow { left: calc(16px + var(--ax, 0px) + var(--pos-room, ${POS_ROOM}px)); right: calc(16px + var(--ax, 0px)); bottom: calc(4px + var(--ay, 0px)); }
.band.rd:not(.rest) > .pos { position: absolute; left: calc(16px + var(--ax, 0px)); bottom: calc(var(--ay, 0px) + 1px); width: calc(var(--pos-room, ${POS_ROOM}px) - 8px); font: 400 11px/11px var(--font-band); color: var(--b-dim); direction: rtl; text-align: left; white-space: nowrap; pointer-events: none; z-index: 3; }
.pill { position: absolute; bottom: 2px; right: clamp(${PILL_HALF}px, var(--p), calc(100% - ${PILL_HALF}px)); transform: translateX(50%); min-width: 22px; height: 14px; padding: 0 5px; border-radius: 7px 7px 0 0; background: var(--ring); color: #fff; font: 700 11px/14px var(--font-band); text-align: center; white-space: nowrap; box-shadow: 0 0 10px 2px color-mix(in srgb, var(--ring) 55%, transparent); animation: pillTo .7s cubic-bezier(.33, 1, .68, 1) both; }
@keyframes pillTo { from { right: clamp(${PILL_HALF}px, var(--from), calc(100% - ${PILL_HALF}px)); } }
.cv-inline .cover-title { font-size: max(9px, calc(26px * var(--cv, 1))); }
.cv-inline .cover-keys { font-size: max(9px, calc(10.5px * var(--cv, 1))); column-gap: calc(16px * var(--cv, 1)); white-space: nowrap; }
.cv-inline .cover-keys .kc { height: calc(17px * var(--cv, 1)); font-size: max(9px, calc(9.5px * var(--cv, 1))); }
.cv-inline .cover-keys span { line-height: calc(17px * var(--cv, 1)); }
.band.band.line:has(.cv-inline) { overflow: hidden; }
.band.card { padding: calc(12px + var(--ay, 0px)) calc(16px + var(--ax, 0px)); }
.band.card .done-row { margin-left: 14px; }
.band { min-height: 100%; }
/* Faded, the reading folds to one row: the thikr cut short, then where it stands. */
.band.band.rest { display: flex; align-items: center; padding: var(--ay, 0px) calc(14px + var(--ax, 0px)) var(--ay, 0px) calc(34px + var(--ax, 0px)); }
/* Folded, the sky's moon would sit on the position, so it goes. */
.band.band.rest.bg-crescent::before { display: none; }
.band.rest .peek { display: flex; align-items: center; gap: 12px; width: 100%; direction: rtl; }
.band.rest .pk-text { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: right; font-family: var(--font-band); font-size: 15px; line-height: 1.6; color: var(--b-ink); }
.band.rest .cv-peek .pk-title { flex: none; font-family: var(--font-cover); font-size: 17px; line-height: 1.5; white-space: nowrap; color: var(--b-acc); }
.band.rest .cv-peek .pk-hint { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: ltr; text-align: left; font-family: var(--font-ui); font-size: 13px; line-height: 1.6; color: var(--b-dim); }
.band.rest .pk-pos { flex: none; white-space: nowrap; font-size: 11.5px; color: var(--b-dim); font-family: var(--font-band); }
.band[data-band] .text, .band.line .text { font-size: var(--fs, 14px) !important; max-height: none; overflow: visible; }
.pglow b { animation: glowTo .7s cubic-bezier(.33, 1, .68, 1) both; }
@keyframes glowTo { from { width: var(--from); } }
.endfx { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 5; border-radius: inherit; }
.fall { position: absolute; top: -30px; color: var(--ring); animation: fall linear forwards; opacity: .9; }
@keyframes fall { to { transform: translateY(var(--dy)) rotate(var(--rot)); opacity: 0; } }
.rise-msg { position: absolute; left: 50%; bottom: 24px; font-family: var(--font-band, var(--font-ar)); font-size: var(--rs, 30px); white-space: nowrap; direction: rtl; color: var(--b-ink); text-shadow: 0 0 18px color-mix(in srgb, var(--ring) 70%, transparent); opacity: 0; animation: riseMsg 2.8s ease-out both; }
@keyframes riseMsg { 0% { opacity: 0; transform: translate(-50%, 30px); } 30% { opacity: 1; } 75% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -110px); } }
/* The end verse: on a sky the words' color, on Frame the main color, as
   the frame and the progress line. The finale's is in the words' face too. */
.band.bg-frame .done-row .big, .band.bg-frame .rise-msg, .band.bg-frame .dn-peek .pk-text { color: var(--b-acc); }
/* Skies have no edge line, colored or white: the picture is the edge. */
.band.band.band.sky, .band.band.band.sky.edge:not(.framed) { border-color: transparent !important; }
/* Frame: at rest the app's own quiet line; lit, the accent line
   and the glow breathing inside the edge, since the picture ends at it. */
.band.band.al-breathe:not(.active) { border-color: var(--desk-line) !important; }
.band.band.al-breathe.active { border-color: var(--b-acc) !important; animation: breatheIn 5.5s ease-in-out infinite; animation-delay: var(--t, 0s); }
@keyframes breatheIn { 0%, 100% { box-shadow: inset 0 0 8px 0 color-mix(in srgb, var(--b-acc) 16%, transparent); } 50% { box-shadow: inset 0 0 16px 1px color-mix(in srgb, var(--b-acc) 32%, transparent); } }
`

const DIGITS = '٠١٢٣٤٥٦٧٨٩'
const ar = (n: number) => String(n).replace(/\d/g, d => DIGITS[Number(d)] ?? d)

const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const MOUSE = (side: 'left' | 'right') =>
  `<span class="kc kc-mouse"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 14" width="9" height="12"><rect x=".6" y=".6" width="8.8" height="12.8" rx="4.4" fill="none" stroke="currentColor" stroke-width="1.1"></rect><path d="M5 .6V5.8M.6 5.8H9.4" stroke="currentColor" stroke-width="1.1" fill="none"></path><path d="${side === 'right' ? 'M5 .6A4.4 4.4 0 0 1 9.4 5V5.8H5Z' : 'M5 .6A4.4 4.4 0 0 0 .6 5V5.8H5Z'}" fill="currentColor"></path></svg></span>`

const kc = (key: string) => `<span class="kc">${key}</span>`

const cover = (m: BandModel) =>
  `<div class="cover cv-inline"><div class="cover-title">${esc(m.title)}</div><div class="cover-keys">`
  + `<span class="cover-go">${MOUSE('left')} ${m.hasBegun ? 'continue' : 'start'}</span>`
  + `<span>${kc('⎵')}${kc('↵')} count</span>`
  + `<span>${MOUSE('right')}${kc('⌫')} undo</span><span>${kc('←')}${kc('→')} move</span></div></div>`

// The room at the line's left for the label: wider when a passage name goes before the position.
const posRoomOf = (m: BandModel) => (m.note ? POS_ROOM_WITH_NOTE : POS_ROOM)

const reading = (m: BandModel) => {
  const label = [m.note, m.position].filter(Boolean).join(' · ')

  return `<div class="text">${esc(m.text)}</div><span class="pos" style="--pos-room:${posRoomOf(m)}px">${esc(label)}</span>`
}

// The repetitions left on this thikr, riding on the progress line's head.
const DONE_PILL = '<span class="pill" style="--p:100%;--from:100%">✓</span>'

const pill = (m: BandModel) =>
  `<span class="pill" style="--p:${m.progress}%;--from:${m.from}%;animation-delay:-${m.glowMs ?? 0}ms">${ar(Math.max(0, m.times - m.count))}</span>`

const folded = (m: BandModel) =>
  `<div class="peek"><span class="pk-text">${esc(m.text)}</span><span class="pk-pos">${esc(m.position)}</span></div>`

// The folded cover: the title on the right, a short muted hint at the left.
export const coverHint = (hasBegun: boolean) => `click to ${hasBegun ? 'continue' : 'start'}`

const foldedCover = (m: BandModel) => {
  const hint = coverHint(m.hasBegun)

  return `<div class="peek cv-peek"><span class="pk-title">${esc(m.title)}</span><span class="pk-hint" style="font-size:${foldedHintSize(hint, m.width)}px">${hint}</span></div>`
}

// The end message is a verse and, after ' — ', where it is from.
const splitEnd = (end: string) => {
  const at = end.lastIndexOf(' — ')

  return at < 0 ? { verse: end, cite: '' } : { verse: end.slice(0, at), cite: end.slice(at + 3) }
}

// The folded done row: the note alone.
const foldedDone = (m: BandModel) => `<div class="peek dn-peek"><span class="pk-text">${esc(m.endNote)}</span></div>`

const done = (m: BandModel) => {
  const { verse, cite } = splitEnd(m.end)
  const fit = doneFit(m.end, m.endHint, m.width)
  const citation = cite ? `<span class="cite">— ${esc(cite)}</span>` : ''
  const hint = fit.hint ? `<span class="dim done-hint">${esc(fit.hint)}</span>` : ''

  return `<div class="done-row" style="--ds:${fit.size}px"><span class="big">${esc(verse)}${citation}</span>${hint}</div>`
}

// The finale shows the verse centered, and where it is from.
const riseHtml = (end: string) => {
  const { verse, cite } = splitEnd(end)

  return esc(verse) + (cite ? `<span class="cite">— ${esc(cite)}</span>` : '')
}

const GLYPHS = ['✦', '✧', '⋆', '✦', '☾']

// Stars falling once over the band; placed by index, and started back by how
// far the finale has gone, so a redraw carries them on.
const falling = (height: number, ms: number) =>
  Array.from({ length: 36 }, (_, i) => {
    const left = (i * 37) % 97
    const size = 10 + ((i * 7) % 14)
    const dy = Math.round(height * (0.55 + ((i * 13) % 40) / 100))
    const rot = ((i * 41) % 180) - 90
    const dur = 1.6 + ((i * 3) % 14) / 10
    const delay = ((i * 5) % 8) / 10 - ms / 1000

    return `<span class="fall" style="left:${left}%;font-size:${size}px;--dy:${dy}px;--rot:${rot}deg;animation-duration:${dur}s;animation-delay:${delay}s">${GLYPHS[i % GLYPHS.length]}</span>`
  }).join('')

const bandClasses = (m: BandModel) => {
  const layout = m.phase === 'done' ? 'card' : 'line compact'
  const edge = m.phase !== 'reading' ? ' edge' : ''
  const active = (m.isActive ? ' active' : '') + (isFolded(m) ? ' rest' : '') + (m.phase === 'reading' ? ' rd' : '')
  if (m.style === 'sky') {
    return `band ${layout} bg-${m.sky} sky ${INK[m.sky]}-ink acc-${m.accent} ts-plain al-fade tc-auto bd-auto dn-soft nm-main fx-rich ui-classic fc-white${edge}${active}`
  }

  return `band ${layout} bg-${m.style} acc-${m.accent} ts-plain al-breathe tc-auto bd-auto dn-soft nm-ink fx-calm ui-classic fc-white${edge}${active}`
}

// Fixed choice geometry, also used by the hooks' pointer hit testing.
export const questionAreas = (width: number) => {
  const left = 40, right = width - 16, middle = (left + right) / 2
  return [
    { x0: middle + 4, x1: right, y0: 40, y1: 70, act: 'finish' as const },
    { x0: left, x1: middle - 4, y0: 40, y1: 70, act: 'resume' as const },
  ]
}
const question = (m: BandModel) => {
  const q = m.question
  if (!q) return ''
  if (isFolded(m)) return `<div class="peek"><span class="pk-text">${esc(q.title)}</span></div>`
  return `<div class="end-question" dir="rtl"><strong>${esc(q.title)}</strong><small>${esc(q.remaining)}</small></div>`
    + questionAreas(m.width).map(a => `<span role="button" class="end-choice ${a.act}${q.focus === a.act ? ' selected' : ''}" style="left:calc(${a.x0}px + var(--ax, 0px));width:${a.x1-a.x0}px;font-size:${Math.min(14, (a.x1-a.x0)/8)}px;top:calc(${a.y0}px + var(--ay, 0px))">${esc(a.act === 'finish' ? q.confirm : q.resume)}</span>`).join('')
}

const bandContent = (m: BandModel) => {
  const isFinale = m.phase === 'done' && m.finaleMs !== undefined
  const inner = isFinale ? '' : m.phase === 'question' ? question(m) : m.phase === 'cover' ? (isFolded(m) ? foldedCover(m) : cover(m)) : m.phase === 'done' ? (isFolded(m) ? foldedDone(m) : done(m)) : isFolded(m) ? folded(m) : reading(m)
  const fx = m.style === 'sky' ? `<span class="fx">${SKY_FX[m.sky]}</span>` : ''
  const hasLine = m.phase === 'question' || m.phase === 'reading' || (m.phase === 'cover' && isFolded(m))
  const progress = hasLine ? m.progress : 100
  const from = hasLine ? m.from : 100
  // Reading, the pill carries the repetitions left; done, a ✓ at the full line's head.
  const isDoneRow = m.phase === 'done' && !isFinale && !isFolded(m)
  const head = m.phase === 'reading' && !isFolded(m) ? pill(m) : isDoneRow ? DONE_PILL : ''
  const glow = `<div style="--pos-room:${posRoomOf(m)}px" class="pglow${progress >= 100 ? ' full' : ''}${progress <= 0 ? ' empty' : ''}"><b style="width:${progress}%;--from:${from}%;animation-delay:-${m.glowMs ?? 0}ms"></b>${head}</div>`
  const ms = m.finaleMs ?? 0
  const end = isFinale
    ? `<span class="endfx">${falling(m.height, ms)}<span class="rise-msg" style="--rs:${finaleSize(m.end, m.width)}px;animation-delay:-${ms}ms">${riseHtml(m.end)}</span></span>`
    : ''
  // Motion keeps its phase across redraws: every animation starts where the clock is.
  const t = `-${((m.now / 1000) % 3600).toFixed(2)}s`

  const reads = m.phase === 'reading'
  const fit = reads ? fitOf(m, m.width) : { size: 0, area: 0, rows: 0 }
  const cv = m.phase === 'cover' ? coverFit(m.width) : 1
  const style = `--t:${t};--fs:${reads ? fit.size : (m.textSize ?? SIZE_DEFAULT)}px${reads ? `;--th:${fit.area}px` : ''}${m.phase === 'cover' ? `;--cv:${cv}` : ''}`

  return { classes: bandClasses(m).replace(/^band /, ''), style, html: `${inner}${fx}${m.phase === 'question' ? '' : glow}${end}`, hoverClose: m.hoverClose }
}

export const bandHtml = (m: BandModel) => cardHtml(cardFrameOf(m), { ...bandContent(m), css: '' })

export const bandSvg = (m: BandModel) => {
  const fonts = [fontFace('Tajawal', 400, TAJAWAL_REGULAR), fontFace('Tajawal', 700, TAJAWAL_BOLD)]
  if (m.phase === 'cover' || m.finaleMs !== undefined) fonts.push(fontFace('Aref Ruqaa', 700, AREF_RUQAA_BOLD))
  const mainColors = Object.keys(ACCENTS).map(color => `--${color === 'orange' ? 'claude' : color}: ${accentHex(color as Accent, m.isDark)};`).join(' ')
  const css = `${fonts.join('\n')}\n:root { ${m.isDark ? ROOT_DARK : ROOT_LIGHT} ${mainColors} ${FONTS} }\n${BAND_CSS}\n${EXTRA_CSS}${m.phase === 'question' ? QUESTION_CSS : ''}`

  return cardSvg(cardFrameOf(m), { ...bandContent(m), css, theme: m.isDark ? 'dark' : 'light' })
}

const SHRINK_AT = 1.05

// The text's wrapped rows at a size (widths are measured at 16px; words wrap a little short of the full width).
const rowsAt = (widths: readonly number[], size: number, room: number) =>
  widths.reduce((sum, w) => sum + Math.max(1, Math.ceil((w * (size / 16) * SHRINK_AT) / room)), 0)

// The cover is the same size as the open reading, its title and keys fitted to
// the width: they shrink together, just enough, never below the floor (the
// keys' 9px of 10.5px). Widths at full size (CSS px), measured in a browser.
const COVER_TITLE_W = 100
const COVER_KEYS_W = 295
const COVER_GAP = 20
export const coverFit = (width: number) => {
  // The band's padding and the cover's take 46px.
  const room = width - 46 - COVER_GAP
  const k = room / (COVER_TITLE_W + COVER_KEYS_W)

  return Math.round(Math.min(1, Math.max(9 / 10.5, k)) * 1000) / 1000
}

// The folded cover's hint: 13px, shrunk to what the row leaves beside the
// title and the ×, to the floor; never wrapped. Widths are estimates (CSS px).
const HINT_BASE = 13
const HINT_EM = 0.58
// The row's padding (34 left, 14 right), the band's frame, the gap and the title at its folded size.
const FOLD_COVER_SIDES = 34 + 14 + FRAME_PX + 12 + 70
export const foldedHintSize = (hint: string, width: number) => {
  const room = Math.max(60, width - FOLD_COVER_SIDES)
  const size = Math.floor((room / (hint.length * HINT_EM)) * 2) / 2

  return Math.max(FIT_MIN, Math.min(HINT_BASE, size))
}

// How the open reading's text sits: one area, two lines of the person's size
// tall for every thikr, the text centered in it. A thikr that does not fit at
// that size shrinks, just enough that its rows fit the area, however narrow
// the window: no floor, the words always stay inside the box.
export const fitOf = (m: Pick<BandModel, 'thikrId' | 'period' | 'textSize'>, width: number) => {
  const widths = TEXT_WIDTH[m.thikrId]
  const lines = m.period === 'evening' && widths?.e ? widths.e : widths?.m ?? [width]
  // Past the band's padding, and the room kept clear of the × and the moon.
  const room = Math.max(120, width - 32 - READ_CLEAR)
  const want = m.textSize ?? SIZE_DEFAULT
  const area = cardArea(want)
  let size = want
  let rows = rowsAt(lines, size, room)
  while (rows * READ_LINE * size > area && size > 1) {
    size -= 0.5
    rows = rowsAt(lines, size, room)
  }

  return { size, rows, area }
}

// The × hit area, in the band's own pixels from its top left; the folded row's is its whole height.
export const closeArea = (m: Pick<BandModel, 'phase' | 'isActive' | 'restHeight' | 'finaleMs'>) => cardClose({ isFolded: isFolded(m), height: m.restHeight ?? 30 })

// A pointer position, in the region's cells, as pixels in the band's own box.
export const pixelOf = (m: Framed, x: number, y: number, columns: number, rows: number) => cardPixel(cardFrameOf(m), x, y, columns, rows)

// The band's height in CSS pixels at a width: one fixed height for the open
// reading, the cover, the finale and the done row, whatever the thikr, the
// count or the width. The folded row is shorter (restHeight).
export const bandHeight = (m: Pick<BandModel, 'phase' | 'thikrId' | 'period' | 'textSize'>, _width: number) => cardHeight(m.textSize)

// The done row: the verse on one line, then where it is from, smaller and
// muted; the hint after them, in one line. When space is short the hint goes
// first (the long one, then the short one), then the verse and its citation
// shrink together, to FIT_MIN, never wrap. Priority: verse, citation, hint.
const DONE_BASE = 14
const DONE_GAP = 12
const CITE_GAP = 6
const HINT_PX = 11.5
// The band's padding takes 2 * 24px, the × clearance 14px, the border 2px.
const DONE_SIDES = 64
const FIT_SAFETY = 1.04

export const endWidth = (end: string, size: number) => {
  const { verse, cite } = splitEnd(end)
  const w = verse.length * END_VERSE_CHAR + (cite ? CITE_GAP + (cite.length + 2) * END_CITE_CHAR * END_CITE_EM : 0)

  return w * (size / 16) * FIT_SAFETY
}

export const doneFit = (end: string, hint: string, width: number) => {
  const room = Math.max(120, width - DONE_SIDES)
  const hintWidth = (text: string) => text.length * HINT_CHAR * HINT_PX + DONE_GAP
  const short = hint.replace(/ → to read again$/, '')
  const options = [hint, short]
  for (const option of options) {
    if (endWidth(end, DONE_BASE) + hintWidth(option) <= room) return { size: DONE_BASE, hint: option }
  }

  let size = DONE_BASE
  while (endWidth(end, size) > room && size > FIT_MIN) size -= 0.5

  return { size, hint: '' }
}

// The finale's verse: a fixed 18px, whatever the width.
export const finaleSize = (_end: string, _width: number) => 18

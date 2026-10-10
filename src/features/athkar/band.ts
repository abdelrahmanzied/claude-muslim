import { BAND_CSS } from './band-css.ts'
import type { Period } from './data.ts'
import { AREF_RUQAA_BOLD, TAJAWAL_BOLD, TAJAWAL_REGULAR } from './fonts.ts'
import type { Sky } from './logic.ts'
import type { Accent, Style } from './look.ts'
import { TEXT_WIDTH } from './metrics.ts'

// The desktop band: the athkar lab's band, drawn as HTML and CSS inside one
// SVG document (an interactive Svg runs CSS animation; no script). Clicks and
// keys are caught by the Client drawn over it.

export type Phase = 'cover' | 'reading' | 'done'

export type BandModel = {
  // The text's size in pixels; 16 when absent.
  textSize?: number
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
  choices: readonly number[]
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
  // When it is drawn, so the sky's motion carries on across redraws.
  now: number
  width: number
  height: number
  // On the desktop, the cell the band is laid out in (CSS px): the picture
  // reaches a column past the band's slot at the sides and half a line above
  // and below (a margin of -1 each way) to cover the card the desktop draws
  // around it.
  card?: { ch: number; lh: number }
  // Over the card: the width the picture is drawn at, in CSS pixels, a little
  // past the slot so the desktop narrows it to the slot exactly.
  drawWidth?: number
}

// The desktop's card around the band: 8px at the sides, and a 40px row less a
// line, halved, above and below; its corners round at 10px.
const CARD_X = 8
const cardY = (lh: number) => Math.max(0, (40 - lh) / 2)

// The picture's size, and where the band's own box starts in it.
export const frameOf = (m: Pick<BandModel, 'width' | 'height' | 'card' | 'drawWidth'>) => {
  if (!m.card) return { width: m.width, height: m.height, left: 0, top: 0, padX: 0, padY: 0, addX: 0, addY: 0 }
  const { ch, lh } = m.card

  return {
    width: Math.round(m.drawWidth ?? m.width + 2 * ch),
    height: Math.round(m.height + lh),
    left: ch,
    top: lh / 2,
    // Past the card's edge the picture is cut off: left empty.
    padX: Math.max(0, ch - CARD_X),
    padY: Math.max(0, lh / 2 - cardY(lh)),
    // Over the card: the band grows to its edges, its content where it was.
    addX: CARD_X,
    addY: cardY(lh),
  }
}

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
const ROOT_LIGHT = '--desk-bg: #ffffff; --desk-side: #f7f6f2; --desk-ink: #1f1f1f; --desk-dim: #8b8b85; --desk-line: #e6e4dd; --claude: #c8642d; --claude-soft: #f8ebe2; --claude-faint: #fcf5f0; --green: #0b7a50; --green-soft: #d2ece0; --green-faint: #eef8f3; --gold: #c99a1f; --gold-soft: #f6eac8; --gold-faint: #fdf8ea; --blue: #3a6aa3; --blue-soft: #dbe6f3; --blue-faint: #f1f5fa;'
const ROOT_DARK = '--desk-bg: #1f1e1c; --desk-side: #262522; --desk-ink: #ecebe6; --desk-dim: #8f8d86; --desk-line: #34322e; --claude: #d97757; --claude-soft: #3a2a22; --claude-faint: #2b2420; --green: #1a9466; --green-soft: #133328; --green-faint: #0f231c; --gold: #e8b93c; --gold-soft: #3b3018; --gold-faint: #272114; --blue: #4a7fc0; --blue-soft: #1c2a3d; --blue-faint: #161f2b;'
const FONTS = '--font-band: "Tajawal", sans-serif; --font-ar: "Tajawal", sans-serif; --font-cover: "Aref Ruqaa", "Tajawal", serif; --font-ui: system-ui, -apple-system, "Segoe UI", sans-serif; --font-mono: ui-monospace, Menlo, monospace;'

// What the band adds to the lab's rules: it fills the picture, the text is never
// cut (the lab scrolled past three lines), the glow eases from its last value,
// and stars fall at the end.
const EXTRA_CSS = `
* { box-sizing: border-box; }
.wrap { width: 100%; height: 100%; padding: 1px; }
.band.line { padding: calc(10px + var(--ay, 0px)) calc(14px + var(--ax, 0px)); }
.band.card { padding: calc(12px + var(--ay, 0px)) calc(16px + var(--ax, 0px)); }
.band { min-height: 100%; }
.band[data-band] .text, .band.line .text { font-size: var(--fs, 16px) !important; max-height: none; overflow: visible; }
.pglow b { animation: glowTo .7s cubic-bezier(.33, 1, .68, 1) both; }
@keyframes glowTo { from { width: var(--from); } }
.endfx { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 5; border-radius: inherit; }
.fall { position: absolute; top: -30px; color: var(--ring); animation: fall linear forwards; opacity: .9; }
@keyframes fall { to { transform: translateY(var(--dy)) rotate(var(--rot)); opacity: 0; } }
.rise-msg { position: absolute; left: 50%; bottom: 24px; font-family: var(--font-cover); font-size: 30px; white-space: nowrap; direction: rtl; color: var(--ring); text-shadow: 0 0 18px color-mix(in srgb, var(--ring) 70%, transparent); opacity: 0; animation: riseMsg 2.8s ease-out both; }
@keyframes riseMsg { 0% { opacity: 0; transform: translate(-50%, 30px); } 30% { opacity: 1; } 75% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -110px); } }
/* Skies have no edge line, colored or white: the picture is the edge. */
.band.band.band.sky, .band.band.band.sky.edge:not(.framed) { border-color: transparent !important; }
/* Sand and Outline: at rest the app's own quiet line; lit, the accent line
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
  + `<span>${kc('⎵')}${kc('↵')} count</span><span>${kc('←')}${kc('→')} move</span>`
  + `<span>${MOUSE('right')}${kc('⌫')} undo</span><span>${kc('esc')} pause</span></div></div>`

// Up to ten circles, one per count; above ten, ten circles of a tenth each,
// the one being counted filling like water.
const circles = (n: number, times: number) => {
  if (times <= 10) {
    return Array.from({ length: times }, (_, i) => `<i class="nb${i < n ? ' on' : ''}">${ar(i + 1)}</i>`).join('')
  }
  const per = times / 10
  const done = Math.floor(n / per)

  return Array.from({ length: 10 }, (_, i) => {
    if (i < done) return `<i class="nb r on">${ar((i + 1) * per)}</i>`
    if (i === done && n < times) return `<i class="nb r fill" style="--p:${Math.round(((n % per) / per) * 100)}">${ar(n)}</i>`

    return `<i class="nb r later">${ar((i + 1) * per)}</i>`
  }).join('')
}

const choice = (m: BandModel) =>
  m.choices.length === 0
    ? ''
    : `<span class="choice">${m.choices.map(c => `<button type="button" aria-pressed="${c === m.times}">${ar(c)}</button>`).join('')}</span>`

const reading = (m: BandModel) =>
  `<div class="text">${esc(m.text)}</div><div class="sub"><div class="nbs">${circles(m.count, m.times)}</div>${choice(m)}`
  + `<span class="hint state keys"></span><span class="src">${esc([m.note, m.position].filter(Boolean).join(' · '))}</span></div>`

const done = (m: BandModel) =>
  `<div class="done-row"><span class="big">${esc(m.end)}</span><span class="dim done-hint">${esc(m.endHint)}</span></div>`

const GLYPHS = ['✦', '✧', '⋆', '✦', '☾']

// Stars falling once over the band; placed by index, and started back by how
// far the finale has gone, so a redraw carries them on.
const falling = (height: number, ms: number) =>
  Array.from({ length: 26 }, (_, i) => {
    const left = (i * 37) % 96
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
  const active = m.isActive ? ' active' : ''
  if (m.style === 'sky') {
    return `band ${layout} bg-${m.sky} sky ${INK[m.sky]}-ink acc-${m.accent} ts-plain al-fade tc-auto bd-auto dn-soft nm-main fx-rich ui-classic fc-white${edge}${active}`
  }

  return `band ${layout} bg-${m.style} acc-${m.accent} ts-plain al-breathe tc-auto bd-auto dn-soft nm-ink fx-calm ui-classic fc-white${edge}${active}`
}

const fontFace = (family: string, weight: number, data: string) =>
  `@font-face { font-family: "${family}"; font-weight: ${weight}; src: url(data:font/woff2;base64,${data}) format("woff2"); }`

export const bandHtml = (m: BandModel) => {
  const isFinale = m.phase === 'done' && m.finaleMs !== undefined
  const inner = isFinale ? '' : m.phase === 'cover' ? cover(m) : m.phase === 'done' ? done(m) : reading(m)
  const fx = m.style === 'sky' ? `<span class="fx">${SKY_FX[m.sky]}</span>` : ''
  const progress = m.phase === 'reading' ? m.progress : 100
  const from = m.phase === 'reading' ? m.from : 100
  const glow = `<div class="pglow${progress >= 100 ? ' full' : ''}${progress <= 0 ? ' empty' : ''}"><b style="width:${progress}%;--from:${from}%;animation-delay:-${m.glowMs ?? 0}ms"></b></div>`
  const ms = m.finaleMs ?? 0
  const end = isFinale
    ? `<span class="endfx">${falling(m.height, ms)}<span class="rise-msg" style="animation-delay:-${ms}ms">${esc(m.end)}</span></span>`
    : ''
  // Motion keeps its phase across redraws: every animation starts where the clock is.
  const t = `-${((m.now / 1000) % 3600).toFixed(2)}s`

  const f = frameOf(m)
  const card = m.card ? `;--ax:${f.addX}px;--ay:${f.addY}px;border-radius:10px` : ''

  return `<div class="${bandClasses(m)}" data-band="" style="--t:${t};--fs:${m.textSize ?? 16}px${card}"><span class="x xabs">×</span>${inner}${fx}${glow}${end}</div>`
}

export const bandSvg = (m: BandModel) => {
  const fonts = [fontFace('Tajawal', 400, TAJAWAL_REGULAR), fontFace('Tajawal', 700, TAJAWAL_BOLD)]
  if (m.phase === 'cover' || m.finaleMs !== undefined) fonts.push(fontFace('Aref Ruqaa', 700, AREF_RUQAA_BOLD))
  const style = `${fonts.join('\n')}\n:root { ${m.isDark ? ROOT_DARK : ROOT_LIGHT} ${FONTS} }\n${BAND_CSS}\n${EXTRA_CSS}`

  const f = frameOf(m)
  const pad = m.card ? ` style="padding:${f.padY}px ${f.padX}px"` : ''

  // Over the card the desktop narrows the picture to the slot, a hair: it
  // stretches to fill rather than leave a strip of the card.
  const box = `width="${f.width}" height="${f.height}" viewBox="0 0 ${f.width} ${f.height}"${m.card ? ' preserveAspectRatio="none"' : ''}`

  return `<svg xmlns="http://www.w3.org/2000/svg" ${box} data-theme="${m.isDark ? 'dark' : 'light'}">`
    + `<style><![CDATA[${style}]]></style>`
    + `<foreignObject x="0" y="0" width="${f.width}" height="${f.height}"><div xmlns="http://www.w3.org/1999/xhtml" class="wrap"${pad}>${bandHtml(m)}</div></foreignObject></svg>`
}

// The band's height in CSS pixels at a width, as the lab lays it out.
export const bandHeight = (m: Pick<BandModel, 'phase' | 'thikrId' | 'period' | 'times' | 'textSize'>, width: number) => {
  if (m.phase === 'done') return 56
  const widths = TEXT_WIDTH[m.thikrId]
  const lines = m.period === 'evening' && widths?.e ? widths.e : widths?.m ?? [width]
  const room = Math.max(120, width - 32)
  // Words wrap a little short of the full width.
  // Widths are measured at 16px; a line is 1.9 times the text's size.
  const scale = (m.textSize ?? 16) / 16
  const rows = lines.reduce((sum, w) => sum + Math.max(1, Math.ceil((w * scale * 1.05) / room)), 0)
  const circles = m.times > 10 ? 30 : 24
  const reading = Math.ceil(22 + rows * 30.4 * scale + 4 + circles + 6)

  return m.phase === 'cover' ? Math.max(76, reading) : reading
}

// The desktop Al-Kahf card: the shared card (src/shared/card) at the athkar folded
// row's height, in the athkar «frame» look (its 1.5px accent frame and breathing
// glow come from the same rules, not a border of its own). One RTL row inside the
// shell's padding, so nothing sits where the desktop crops: «سورة الكهف» in the
// folded title's Ruqaa with «يوم الجمعة · بصوت <reciter>» inline after it, the Quran
// avatar (the pane's own, moving as it does while playing), a compact pill («▶ استمع»,
// or «↗ افتح في المتصفح» where the surah opens in the browser) and the × at the left.
// Pure: install.tsx supplies the props; card.tsx builds the picture on the drawing thread.

import { REST_PX, cardSvg, closeArea, drawWidthOf, fontFace, frameOf, pixelOf, type CardFrame } from '../../shared/card/card.ts'
import type { CardProps, CardView } from '../../shared/card/client.tsx'
import { accentHex, type Accent } from '../../shared/color/index.ts'
import { AREF_RUQAA_BOLD } from '../../shared/font/aref-ruqaa-embedded.ts'
import { TAJAWAL_BOLD_WOFF2, TAJAWAL_REGULAR_WOFF2 } from '../../shared/font/tajawal-embedded.ts'
import { avatarSvg } from '../../shared/quran-avatar/index.ts'
import { KAHF_BROWSER, KAHF_PLAY, KAHF_TITLE, kahfSubtitle } from './logic.ts'

export type KahfCardProps = CardProps & {
  accent: Accent
  // The reciter last used, short Arabic name; empty until the Quran is ready.
  reciter: string
  // Windows and Linux: the pill opens the surah in the browser instead of playing it.
  inBrowser: boolean
  // When the card appeared (the hooks module's clock), so the avatar's motion counts from there and a redraw carries on.
  startedAt: number
  // The slot's width and the desktop's cell, in CSS pixels.
  width: number
  card: { ch: number; lh: number }
}

// The folded row's height, as the athkar folded row has it.
export const kahfFrame = (p: Pick<KahfCardProps, 'width' | 'card'>, columns = 0): CardFrame => ({
  width: p.width,
  height: REST_PX,
  isFolded: true,
  card: p.card,
  drawWidth: drawWidthOf(p.card, columns),
})

// The row, in CSS pixels, as the folded athkar row has it: 34 at the left (the ×), 14 at the right, 12 between parts.
const PAD_LEFT = 34
const PAD_RIGHT = 14
const GAP = 12
// The row's content must fit what the shell leaves of the folded height (24 + 20 less its 10px each side and the 3px frame: 21px), or the band outgrows its picture and the frame's bottom is cut off.
const PILL_H = 20
const PILL_W = { play: 76, browser: 128 }
// The avatar's height, taller than the row's line: it keeps its place in the flow with a negative margin. Its width follows its 32:30 picture.
const AVATAR_H = 36
const AVATAR_SIZE = (AVATAR_H * 32) / 30
const AVATAR_W = Math.round(AVATAR_SIZE)
const AVATAR_PULL = Math.round((AVATAR_H - 18) / 2)
// The frame's own line, as the shared card's border minus the wrap's.
const FRAME_LINE = 1.5

const pillWidth = (inBrowser: boolean) => (inBrowser ? PILL_W.browser : PILL_W.play)

// Where each part sits, from the card's left edge in CSS pixels (the row's padding in, the frame's line first): in the row's own order from the left, the pill, the avatar, then the text.
export const kahfLayout = (inBrowser: boolean) => {
  const pillLeft = FRAME_LINE + PAD_LEFT
  const avatarLeft = pillLeft + pillWidth(inBrowser) + GAP

  return { pillLeft, pillWidth: pillWidth(inBrowser), pillHeight: PILL_H, avatarLeft, avatarWidth: AVATAR_W, avatarHeight: AVATAR_H, textLeft: avatarLeft + AVATAR_W + GAP }
}

// Same bounds for drawing-thread hover and hooks-thread clicks, including the desktop shell's extra padding.
export const playArea = (f: CardFrame, inBrowser = false) => {
  const box = frameOf(f)
  const l = kahfLayout(inBrowser)
  const x0 = (f.card ? box.padX : 1) + l.pillLeft + box.addX - box.left

  return { x0, x1: x0 + l.pillWidth, y0: (f.height - PILL_H) / 2, y1: (f.height + PILL_H) / 2 }
}
// The target takes a margin past the pill, short of the ×.
const MARGIN = 6
export const playHitArea = (f: CardFrame, inBrowser = false) => {
  const a = playArea(f, inBrowser)

  return { x0: Math.max(a.x0 - MARGIN, closeArea(f).x1 + 1), x1: a.x1 + MARGIN, y0: 0, y1: f.height }
}
export const isOnPlay = (p: KahfCardProps, x: number, y: number, columns: number, rows: number): boolean => {
  const frame = kahfFrame(p, columns)
  const { px, py } = pixelOf(frame, x, y, columns, rows)
  const a = playHitArea(frame, p.inBrowser)

  return px >= a.x0 && px <= a.x1 && py >= a.y0 && py <= a.y1
}

// The athkar frame look's rules (athkar/band.ts), lit: the frame in the main color, a quiet glow breathing inside it, and the app's own light or dark behind.
const css = (accent: Accent, inBrowser: boolean) => [
  fontFace('Tajawal', 400, TAJAWAL_REGULAR_WOFF2),
  fontFace('Tajawal', 700, TAJAWAL_BOLD_WOFF2),
  fontFace('Aref Ruqaa', 700, AREF_RUQAA_BOLD),
  `:root { --ink: #ecebe6; --dim: #8f8d86; --bg: #1f1e1c; --acc: ${accentHex(accent, true)}; }`,
  `@media (prefers-color-scheme: light) { :root { --ink: #1f1f1f; --dim: #8b8b85; --bg: #ffffff; --acc: ${accentHex(accent, false)}; } }`,
  '.band { color: var(--ink); --b-ink: var(--ink); --b-dim: var(--dim); --b-acc: var(--acc); }',
  '.band.bg-frame { background: transparent; border: 1.5px solid var(--b-acc); }',
  '.band.band.al-breathe.active { border-color: var(--b-acc) !important; animation: breatheIn 5.5s ease-in-out infinite; }',
  '@keyframes breatheIn { 0%, 100% { box-shadow: inset 0 0 8px 0 color-mix(in srgb, var(--b-acc) 16%, transparent); } 50% { box-shadow: inset 0 0 16px 1px color-mix(in srgb, var(--b-acc) 32%, transparent); } }',
  '@media (prefers-color-scheme: light) { .band.bg-frame { background: var(--bg); } }',
  '@media (prefers-reduced-motion: reduce) { .band.band.al-breathe.active { animation: none; } }',
  // The row: the athkar folded row's padding and gap, everything in the flow.
  `.band.band.kahf { display: flex; align-items: center; gap: ${GAP}px; direction: rtl; font-family: Tajawal, sans-serif; font-weight: 700; height: 100%; min-height: 0;`,
  `  padding: var(--ay, 0px) calc(${PAD_RIGHT}px + var(--ax, 0px)) var(--ay, 0px) calc(${PAD_LEFT}px + var(--ax, 0px)); }`,
  '.kahf .text { flex: 1 1 auto; min-width: 0; display: flex; align-items: baseline; gap: 10px; overflow: hidden; white-space: nowrap; }',
  '.kahf .title { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; font-family: "Aref Ruqaa", Tajawal, serif; font-weight: 700; font-size: 17px; line-height: 20px; color: var(--b-acc); }',
  '.kahf .sub { flex: 0 100 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; font-size: 12.5px; font-weight: 400; line-height: 20px; color: var(--b-dim); }',
  `.kahf .pic { flex: none; width: ${AVATAR_W}px; height: ${AVATAR_H}px; margin: -${AVATAR_PULL}px 0; direction: ltr; }`,
  '.kahf .pic svg { display: block; }',
  `.kahf .play { flex: none; width: ${pillWidth(inBrowser)}px; height: ${PILL_H}px; display: flex; align-items: center; justify-content: center; white-space: nowrap; font-size: 12px; font-weight: 700; direction: rtl;`,
  '  border-radius: 999px; border: 1.5px solid var(--b-acc); color: var(--b-acc); cursor: pointer; transition: background .2s, color .2s; }',
  '.kahf .play.hot { background: var(--b-acc); color: var(--bg); }',
].join('\n')

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const kahfSvg = (p: KahfCardProps, view: Pick<CardView, 'hoverClose' | 'columns' | 'hoverAction' | 'gone'>) =>
  cardSvg(kahfFrame(p, view.columns), {
    classes: 'line compact bg-frame al-breathe kahf rest active',
    style: '',
    html: `<div class="text"><span class="title">${KAHF_TITLE}</span><span class="sub">${escape(kahfSubtitle(p.reciter))}</span></div>`
      + `<div class="pic">${avatarSvg(true, Math.max(0, p.now - p.startedAt) + view.gone, AVATAR_SIZE)}</div>`
      + `<span class="play${view.hoverAction ? ' hot' : ''}">${p.inBrowser ? KAHF_BROWSER : KAHF_PLAY}</span>`,
    css: css(p.accent, p.inBrowser),
    hoverClose: view.hoverClose,
  })

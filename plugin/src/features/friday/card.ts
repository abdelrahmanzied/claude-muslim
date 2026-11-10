// The desktop Al-Kahf card: the shared card (src/shared/card), the same size, frame
// and × as the athkar band and the athan card. «سورة الكهف» in the athkar cover's
// Ruqaa, «يوم الجمعة · بصوت <reciter>» under it, the Quran avatar (the pane's own,
// moving as it does while playing) and a pill: «▶ استمع» where the surah plays,
// «↗ افتح في المتصفح» where it opens in the browser. Pure: install.tsx supplies the
// props; card.tsx builds the picture on the drawing thread.

import { cardHeight, cardSvg, closeArea, drawWidthOf, fontFace, frameOf, pixelOf, type CardFrame } from '../../shared/card/card.ts'
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

export const kahfFrame = (p: Pick<KahfCardProps, 'width' | 'card'>, columns = 0): CardFrame => ({
  width: p.width,
  height: cardHeight(),
  isFolded: false,
  card: p.card,
  drawWidth: drawWidthOf(p.card, columns),
})

// From the card's left edge: the × corner, the pill, the avatar, then the text block.
const PLAY_LEFT = 35
const PLAY_H = 30
const PLAY_W = { play: 88, browser: 150 }
const GAP = 10
// The avatar's height; its width follows its 32:30 picture.
const AVATAR_H = 70
const AVATAR_SIZE = (AVATAR_H * 32) / 30
const AVATAR_W = Math.round(AVATAR_SIZE)
const TEXT_PAD = 22

const playWidth = (inBrowser: boolean) => (inBrowser ? PLAY_W.browser : PLAY_W.play)
const avatarLeft = (inBrowser: boolean) => PLAY_LEFT + playWidth(inBrowser) + GAP
// The text block keeps clear of everything at the left, so a narrow card shortens the title (an ellipsis) before anything overlaps.
const textLeft = (inBrowser: boolean) => avatarLeft(inBrowser) + AVATAR_W + GAP * 1.4

// Where each part sits, from the card's left edge in CSS pixels, for the pill's two widths.
export const kahfLayout = (inBrowser: boolean) => ({
  playLeft: PLAY_LEFT, playWidth: playWidth(inBrowser), avatarLeft: avatarLeft(inBrowser), avatarWidth: AVATAR_W, avatarHeight: AVATAR_H, textLeft: textLeft(inBrowser),
})

// Same bounds for drawing-thread hover and hooks-thread clicks, including the desktop shell's extra padding.
export const playArea = (f: CardFrame, inBrowser = false) => {
  const box = frameOf(f)
  const x0 = box.padX + (f.card ? 0 : 1) + PLAY_LEFT + box.addX - box.left

  return { x0, x1: x0 + playWidth(inBrowser), y0: (f.height - PLAY_H) / 2, y1: (f.height + PLAY_H) / 2 }
}
// The target takes a margin past the pill, short of the ×.
const MARGIN = 8
export const playHitArea = (f: CardFrame, inBrowser = false) => {
  const a = playArea(f, inBrowser)

  return { x0: Math.max(a.x0 - MARGIN, closeArea(f).x1 + 1), x1: a.x1 + MARGIN, y0: a.y0 - MARGIN, y1: a.y1 + MARGIN }
}
export const isOnPlay = (p: KahfCardProps, x: number, y: number, columns: number, rows: number): boolean => {
  const frame = kahfFrame(p, columns)
  const { px, py } = pixelOf(frame, x, y, columns, rows)
  const a = playHitArea(frame, p.inBrowser)

  return px >= a.x0 && px <= a.x1 && py >= a.y0 && py <= a.y1
}

// A plain frame in the main color, the ink and dim of the app's own light or dark.
const css = (accent: Accent, inBrowser: boolean) => [
  fontFace('Tajawal', 400, TAJAWAL_REGULAR_WOFF2),
  fontFace('Tajawal', 700, TAJAWAL_BOLD_WOFF2),
  fontFace('Aref Ruqaa', 700, AREF_RUQAA_BOLD),
  `:root { --ink: #ecebe6; --dim: #8f8d86; --bg: #1f1e1c; --acc: ${accentHex(accent, true)}; }`,
  `@media (prefers-color-scheme: light) { :root { --ink: #1f1f1f; --dim: #8b8b85; --bg: #ffffff; --acc: ${accentHex(accent, false)}; } }`,
  '.band.kahf { height: 100%; border-radius: 10px; border: 1.5px solid var(--acc); color: var(--ink); --b-ink: var(--ink); --b-dim: var(--dim); overflow: hidden;',
  '  direction: rtl; display: flex; align-items: center; justify-content: flex-start; font-family: Tajawal, sans-serif; font-weight: 700;',
  `  padding: var(--ay, 0px) calc(${TEXT_PAD}px + var(--ax, 0px)) var(--ay, 0px) calc(${textLeft(inBrowser)}px + var(--ax, 0px)); }`,
  '.kahf .text { min-width: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }',
  '.kahf .title { font-family: "Aref Ruqaa", Tajawal, serif; font-weight: 700; font-size: 28px; line-height: 1.25; color: var(--acc); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
  '.kahf .sub { font-size: 12.5px; font-weight: 400; line-height: 1.5; color: var(--dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
  `.kahf .pic { position: absolute; left: calc(${avatarLeft(inBrowser)}px + var(--ax, 0px)); bottom: 0; width: ${AVATAR_W}px; height: ${AVATAR_H}px; direction: ltr; }`,
  '.kahf .pic svg { display: block; }',
  `.kahf .play { position: absolute; left: calc(${PLAY_LEFT}px + var(--ax, 0px)); top: 50%; width: ${playWidth(inBrowser)}px; height: ${PLAY_H}px; margin-top: -${PLAY_H / 2}px; box-sizing: border-box;`,
  '  display: flex; align-items: center; justify-content: center; white-space: nowrap; font-size: 13px; font-weight: 700; direction: rtl; border-radius: 999px; border: 1.5px solid var(--acc); color: var(--acc); cursor: pointer; transition: background .2s, color .2s; }',
  '.kahf .play.hot { background: var(--acc); color: var(--bg); }',
].join('\n')

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const kahfSvg = (p: KahfCardProps, view: Pick<CardView, 'hoverClose' | 'columns' | 'hoverAction' | 'gone'>) =>
  cardSvg(kahfFrame(p, view.columns), {
    classes: 'kahf active',
    style: '',
    html: `<span class="play${view.hoverAction ? ' hot' : ''}">${p.inBrowser ? KAHF_BROWSER : KAHF_PLAY}</span>`
      + `<div class="pic">${avatarSvg(true, Math.max(0, p.now - p.startedAt) + view.gone, AVATAR_SIZE)}</div>`
      + `<div class="text"><div class="title">${KAHF_TITLE}</div><div class="sub">${escape(kahfSubtitle(p.reciter))}</div></div>`,
    css: css(p.accent, p.inBrowser),
    hoverClose: view.hoverClose,
  })

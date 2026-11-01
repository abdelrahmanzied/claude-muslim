// The desktop Al-Kahf card: the shared card (src/shared/card), the same size, frame
// and × as the athkar band and the athan card, holding «الجمعة · سورة الكهف» and a ▶
// that plays the surah. Pure: install.tsx supplies the props; card.tsx builds the
// picture on the drawing thread.

import { cardHeight, cardSvg, closeArea, drawWidthOf, fontFace, frameOf, pixelOf, type CardFrame } from '../../shared/card/card.ts'
import type { CardProps, CardView } from '../../shared/card/client.tsx'
import { accentHex, type Accent } from '../../shared/color/index.ts'
import { TAJAWAL_BOLD_WOFF2 } from '../../shared/font/tajawal-embedded.ts'
import { KAHF_TITLE } from './logic.ts'

export type KahfCardProps = CardProps & {
  accent: Accent
  // Desktop plays the surah; false when the player is not ready.
  canPlay: boolean
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

// ▶ is a round 28px target at the card's left, right of the ×.
const PLAY_SIZE = 28
const PLAY_LEFT = 35

// Same bounds for drawing-thread hover and hooks-thread clicks, including the desktop shell's extra padding.
export const playArea = (f: CardFrame) => {
  const box = frameOf(f)
  const x0 = box.padX + (f.card ? 0 : 1) + PLAY_LEFT + box.addX - box.left

  return { x0, x1: x0 + PLAY_SIZE, y0: (f.height - PLAY_SIZE) / 2, y1: (f.height + PLAY_SIZE) / 2 }
}
// The target takes a margin past the circle, short of the ×.
const MARGIN = 8
export const playHitArea = (f: CardFrame) => {
  const a = playArea(f)

  return { x0: Math.max(a.x0 - MARGIN, closeArea(f).x1 + 1), x1: a.x1 + MARGIN, y0: a.y0 - MARGIN, y1: a.y1 + MARGIN }
}
export const isOnPlay = (p: KahfCardProps, x: number, y: number, columns: number, rows: number): boolean => {
  const frame = kahfFrame(p, columns)
  const { px, py } = pixelOf(frame, x, y, columns, rows)
  const a = playHitArea(frame)

  return p.canPlay && px >= a.x0 && px <= a.x1 && py >= a.y0 && py <= a.y1
}

// A plain frame in the main color, the ink and dim of the app's own light or dark.
const css = (accent: Accent) => [
  fontFace('Tajawal', 700, TAJAWAL_BOLD_WOFF2),
  `:root { --ink: #ecebe6; --dim: #8f8d86; --bg: #1f1e1c; --acc: ${accentHex(accent, true)}; }`,
  `@media (prefers-color-scheme: light) { :root { --ink: #1f1f1f; --dim: #8b8b85; --bg: #ffffff; --acc: ${accentHex(accent, false)}; } }`,
  '.band.kahf { height: 100%; border-radius: 10px; border: 1.5px solid var(--acc); color: var(--ink); --b-ink: var(--ink); --b-dim: var(--dim);',
  '  direction: rtl; display: flex; align-items: center; justify-content: center; font-family: Tajawal, sans-serif; font-weight: 700;',
  '  padding: var(--ay, 0px) calc(70px + var(--ax, 0px)); }',
  '.kahf .main { font-size: 20px; line-height: 1.5; white-space: nowrap; }',
  `.kahf .play { position: absolute; left: calc(${PLAY_LEFT}px + var(--ax, 0px)); top: 50%; width: ${PLAY_SIZE}px; height: ${PLAY_SIZE}px; margin-top: -${PLAY_SIZE / 2}px;`,
  '  display: grid; place-items: center; direction: ltr; border-radius: 50%; border: 1.5px solid var(--acc); color: var(--acc); font-size: 11px; padding-left: 2px; cursor: pointer; transition: background .2s, color .2s; }',
  '.kahf .play.hot { background: var(--acc); color: var(--bg); }',
].join('\n')

export const kahfSvg = (p: KahfCardProps, view: Pick<CardView, 'hoverClose' | 'columns' | 'hoverAction'>) =>
  cardSvg(kahfFrame(p, view.columns), {
    classes: 'kahf active',
    style: '',
    html: `${p.canPlay ? `<span class="play${view.hoverAction ? ' hot' : ''}">▶</span>` : ''}<div class="main">${KAHF_TITLE}</div>`,
    css: css(p.accent),
    hoverClose: view.hoverClose,
  })

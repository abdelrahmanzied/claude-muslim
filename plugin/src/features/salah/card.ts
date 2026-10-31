// The desktop athan card: the shared card (src/shared/card), the same size,
// frame, × and clicks as the athkar band, holding a photo behind the call and
// its time. Pure: install.tsx reads the photo and draws it; athan-card.tsx
// builds the picture on the drawing thread.

import { cardHeight, cardSvg, drawWidthOf, closeArea, fontFace, frameOf, pixelOf, REST_PX, type CardFrame } from '../../shared/card/card.ts'
import type { CardProps, CardView } from '../../shared/card/client.tsx'
import { arabicDigits, athanText, IN_MS } from '../../shared/pray/line.ts'
import type { Pray } from '../../shared/pray/names.ts'
import { accentHex, type Accent } from '../../shared/color/index.ts'
import { ARUQAA_BOLD } from './card-font.ts'
import { drawText, textCss } from '../../shared/text/index.ts'

// How long the card stays when nobody closes it: the call's window.
export const CARD_MS = IN_MS
export const FOLD_MS = 60_000

export const cardIsFolded = (moment: { isFolded: boolean; foldsAt: number }, now: number) =>
  moment.isFolded || now >= moment.foldsAt

export type AthanCardProps = CardProps & {
  isFolded: boolean
  canStart?: boolean
  accent?: Accent
  pray: Pray
  // The clock text, e.g. `15:59`.
  time: string
  // The photo, base64 JPEG.
  photo: string
  // The slot's width and the desktop's cell, in CSS pixels.
  width: number
  card: { ch: number; lh: number }
}

export const athanFrame = (p: Pick<AthanCardProps, 'width' | 'card' | 'isFolded'>, columns = 0): CardFrame => ({
  width: p.width,
  height: p.isFolded ? REST_PX : cardHeight(),
  isFolded: p.isFolded,
  card: p.card,
  drawWidth: drawWidthOf(p.card, columns),
})

export const START_LABEL = 'ابدأ أذكار بعد الصلاة'
// Aref Ruqaa Bold label at 15px: ~93px; the monospace space + arrow at
// 12px: ~14.4px. Use these text metrics for both the drawn span and its target.
const START_WIDTH = 93 + 14.4
const START_HEIGHT = 24
const START_LEFT = 35

// Same bounds for drawing-thread hover and hooks-thread clicks, including the
// desktop shell's extra padding and the measured Client width.
export const startArea = (f: CardFrame) => {
  const box = frameOf(f)
  const x0 = box.padX + (f.card ? 0 : 1) + START_LEFT + box.addX - box.left
  return { x0, x1: x0 + START_WIDTH, y0: (f.height - START_HEIGHT) / 2, y1: (f.height + START_HEIGHT) / 2 }
}
// The button takes its whole frame and a margin past it, short of the × at the left;
// the drawing thread lights it over the same area.
export const START_MARGIN = { x: 8, y: 8 }
export const startHitArea = (f: CardFrame) => {
  const a = startArea(f)
  return { x0: Math.max(a.x0 - START_MARGIN.x, closeArea(f).x1 + 1), x1: a.x1 + START_MARGIN.x, y0: a.y0 - START_MARGIN.y, y1: a.y1 + START_MARGIN.y }
}
export const isOnStart = (p: AthanCardProps, x: number, y: number, columns: number, rows: number) => {
  const frame = athanFrame(p, columns)
  const { px, py } = pixelOf(frame, x, y, columns, rows)
  const a = startHitArea(frame)
  return !!p.canStart && px >= a.x0 && px <= a.x1 && py >= a.y0 && py <= a.y1
}

// The photo is a 640 by 80 strip cut from the original, a little above its
// middle; `cover` fits it to the card's width. The words are white on it, and so is the ×.
const css = (photo: string, accent: Accent) => [
  fontFace('Aref Ruqaa', 700, ARUQAA_BOLD),
  // The start control's main color: dark first, light when the app is light (as the Muslim pane does).
  `.band.athan { --start-accent: ${accentHex(accent, true)}; }`,
  `@media (prefers-color-scheme: light) { .band.athan { --start-accent: ${accentHex(accent, false)}; } }`,
  '.band.athan { height: 100%; border-radius: 10px; direction: rtl; color: #fff; --b-ink: #fff; --b-dim: rgba(255,255,255,.75);',
  '  font-family: "Aref Ruqaa", serif; font-weight: 700; display: flex; flex-direction: column; justify-content: center;',
  '  padding: var(--ay, 0px) calc(36px + var(--ax, 0px));',
  `  background: linear-gradient(rgba(0,0,0,.35), rgba(0,0,0,.7)), url(data:image/jpeg;base64,${photo}) center 50% / cover; }`,
  // The lines go through the shared text classes (line-height 2); each margin takes back what that adds to its old line-height, (2 - old) / 2 em, so the card keeps its height.
  '.athan .main { font-size: 26px; margin-block: -.25em; }',
  '.athan.rest { flex-direction: row; justify-content: flex-start; align-items: center; gap: 12px; white-space: nowrap; }',
  '.athan.rest .main, .athan.rest .time { font-size: 17px; margin-block: -.5em; }',
  `.athan .start { position: absolute; left: calc(${START_LEFT}px + var(--ax, 0px)); top: 50%; transform: translateY(-50%);`,
  `  width: ${START_WIDTH}px; height: ${START_HEIGHT}px; display: flex; align-items: center; direction: ltr;`,
  '  font: 700 15px/1 "Aref Ruqaa", serif; color: #fff; white-space: nowrap; cursor: pointer; text-shadow: 0 1px 3px rgba(0,0,0,.8); }',
  '.athan .start-label { width: 93px; direction: rtl; }',
  '.athan .start-arrow { font: 400 12px/1 monospace; white-space: pre; }',
  '.athan .start.hot { color: var(--start-accent); filter: brightness(1.15); }',
  '.athan .time { font-size: 17px; margin-block: -.3em; color: rgba(255,255,255,.85); }',
  textCss(),
].join('\n')

export const athanSvg = (p: AthanCardProps, view: Pick<CardView, 'hoverClose' | 'columns' | 'hoverAction'>) =>
  cardSvg(athanFrame(p, view.columns), {
    classes: `athan active${p.isFolded ? ' rest' : ''}`,
    style: '',
    html: `${p.canStart ? `<span class="start${view.hoverAction ? ' hot' : ''}"><span class="start-arrow">← </span><span class="start-label">${START_LABEL}</span></span>` : ''}${drawText(athanText(p.pray), { className: 'main', tag: 'div' })}${drawText(arabicDigits(p.time), { className: 'time', tag: 'div' })}`,
    css: css(p.photo, p.accent ?? 'orange'),
    hoverClose: view.hoverClose,
  })

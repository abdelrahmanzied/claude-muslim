// The desktop athan card: the shared card (src/shared/card), the same size,
// frame, × and clicks as the athkar band, holding a photo behind the call and
// its time. Pure: install.tsx reads the photo and draws it; athan-card.tsx
// builds the picture on the drawing thread.

import { cardHeight, cardSvg, drawWidthOf, fontFace, frameOf, pixelOf, REST_PX, type CardFrame } from '../../shared/card/card.ts'
import type { CardProps, CardView } from '../../shared/card/client.tsx'
import { arabicDigits, athanText, IN_MS } from '../../shared/pray/line.ts'
import type { Pray } from '../../shared/pray/names.ts'
import { accentHex, type Accent } from '../../shared/color/index.ts'
import { ARUQAA_BOLD } from './card-font.ts'

// How long the card stays when nobody closes it: the call's window.
export const CARD_MS = IN_MS
export const FOLD_MS = 60_000

export const cardIsFolded = (moment: { isFolded: boolean; foldsAt: number }, now: number) =>
  moment.isFolded || now >= moment.foldsAt

export type AthanCardProps = CardProps & {
  isFolded: boolean
  canStart?: boolean
  accent?: Accent
  isDark?: boolean
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
const START_WIDTH = 180

// Same bounds for drawing-thread hover and hooks-thread clicks, including the
// desktop shell's extra padding and the measured Client width.
export const startArea = (f: CardFrame) => {
  const box = frameOf(f)
  const x1 = box.width - box.left - box.padX - (f.card ? 0 : 1) - (12 + box.addX)
  const height = f.isFolded ? 24 : 30
  return { x0: x1 - START_WIDTH, x1, y0: (f.height - height) / 2, y1: (f.height + height) / 2 }
}
export const isOnStart = (p: AthanCardProps, x: number, y: number, columns: number, rows: number) => {
  const frame = athanFrame(p, columns)
  const { px, py } = pixelOf(frame, x, y, columns, rows)
  const a = startArea(frame)
  return !!p.canStart && px >= a.x0 && px <= a.x1 && py >= a.y0 && py <= a.y1
}

// The photo is a 640 by 80 strip cut from the original, a little above its
// middle; `cover` fits it to the card's width. The words are white on it, and so is the ×.
const css = (photo: string) => [
  fontFace('Aref Ruqaa', 700, ARUQAA_BOLD),
  '.band.athan { height: 100%; border-radius: 10px; overflow: hidden; direction: rtl; color: #fff; --b-ink: #fff; --b-dim: rgba(255,255,255,.75);',
  '  font-family: "Aref Ruqaa", serif; font-weight: 700; display: flex; flex-direction: column; justify-content: center;',
  '  padding: var(--ay, 0px) calc(36px + var(--ax, 0px));',
  `  background: linear-gradient(rgba(0,0,0,.35), rgba(0,0,0,.7)), url(data:image/jpeg;base64,${photo}) center 50% / cover; }`,
  '.athan .main { font-size: 26px; line-height: 1.5; }',
  '.athan.rest { flex-direction: row; justify-content: flex-start; align-items: center; gap: 12px; white-space: nowrap; }',
  '.athan.rest .main, .athan.rest .time { font-size: 17px; line-height: 1; }',
  '.athan.has-start { padding-right: calc(210px + var(--ax, 0px)); }',
  '.athan .start { position: absolute; right: calc(12px + var(--ax, 0px)); top: 50%; transform: translateY(-50%);',
  `  width: ${START_WIDTH}px; height: 30px; display: grid; place-items: center; border-radius: 6px; border: 1px solid rgba(255,255,255,.35);`,
  '  font: 700 17px/1 "Aref Ruqaa", serif; background: var(--start-accent); color: var(--start-ink); white-space: nowrap; }',
  '.athan.rest .start { height: 24px; }',
  '.athan .start.hot { filter: brightness(1.15); border-color: #fff; }',
  '.athan .time { font-size: 17px; line-height: 1.4; color: rgba(255,255,255,.85); }',
].join('\n')

export const athanSvg = (p: AthanCardProps, view: Pick<CardView, 'hoverClose' | 'columns' | 'hoverAction'>) =>
  cardSvg(athanFrame(p, view.columns), {
    classes: `athan active${p.isFolded ? ' rest' : ''}${p.canStart ? ' has-start' : ''}`,
    style: `--start-accent:${accentHex(p.accent ?? 'orange', p.isDark ?? true)};--start-ink:${p.accent === 'green' || p.accent === 'blue' ? '#fff' : '#161616'}`,
    html: `${p.canStart ? `<span class="start${view.hoverAction ? ' hot' : ''}">${START_LABEL}</span>` : ''}<div class="main">${athanText(p.pray)}</div><div class="time">${arabicDigits(p.time)}</div>`,
    css: css(p.photo),
    hoverClose: view.hoverClose,
  })

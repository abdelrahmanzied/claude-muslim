// The desktop athan card: the shared card (src/shared/card), the same size,
// frame, × and clicks as the athkar band, holding a photo behind the call and
// its time. Pure: install.tsx reads the photo and draws it; athan-card.tsx
// builds the picture on the drawing thread.

import { cardHeight, cardSvg, drawWidthOf, fontFace, REST_PX, type CardFrame } from '../../shared/card/card.ts'
import type { CardProps, CardView } from '../../shared/card/client.tsx'
import { arabicDigits, athanText, IN_MS } from '../../shared/pray/line.ts'
import type { Pray } from '../../shared/pray/names.ts'
import { ARUQAA_BOLD } from './card-font.ts'

// How long the card stays when nobody closes it: the call's window.
export const CARD_MS = IN_MS
export const FOLD_MS = 60_000

export const cardIsFolded = (moment: { isFolded: boolean; foldsAt: number }, now: number) =>
  moment.isFolded || now >= moment.foldsAt

export type AthanCardProps = CardProps & {
  isFolded: boolean
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

// The photo is a 640 by 80 strip cut from the original, a little above its
// middle; `cover` fits it to the card's width. The words are white on it, and so is the ×.
const css = (photo: string) => [
  fontFace('Aref Ruqaa', 700, ARUQAA_BOLD),
  '.band.athan { height: 100%; border-radius: 10px; overflow: hidden; direction: rtl; color: #fff; --b-ink: #fff; --b-dim: rgba(255,255,255,.75);',
  '  font-family: "Aref Ruqaa", serif; font-weight: 700; display: flex; flex-direction: column; justify-content: center;',
  '  padding: var(--ay, 0px) calc(36px + var(--ax, 0px));',
  `  background: linear-gradient(rgba(0,0,0,.35), rgba(0,0,0,.7)), url(data:image/jpeg;base64,${photo}) center 50% / cover; }`,
  '.athan .main { font-size: 26px; line-height: 1.5; }',
  '.athan.rest { flex-direction: row; align-items: center; gap: 12px; white-space: nowrap; }',
  '.athan.rest .main, .athan.rest .time { font-size: 17px; line-height: 1; }',
  '.athan .time { font-size: 17px; line-height: 1.4; color: rgba(255,255,255,.85); }',
].join('\n')

export const athanSvg = (p: AthanCardProps, view: Pick<CardView, 'hoverClose' | 'columns'>) =>
  cardSvg(athanFrame(p, view.columns), {
    classes: `athan active${p.isFolded ? ' rest' : ''}`,
    style: '',
    html: `<div class="main">${athanText(p.pray)}</div><div class="time">${arabicDigits(p.time)}</div>`,
    css: css(p.photo),
    hoverClose: view.hoverClose,
  })

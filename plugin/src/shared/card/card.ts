import { SIZE_DEFAULT } from '../../config.ts'

// The desktop card above the prompt, shared by every feature that draws one
// (the athkar band, the athan card): one SVG document holding HTML and CSS in
// a foreignObject, drawn by a Client (client.tsx) that catches its clicks and
// keys. The card owns the size, the frame over the desktop's own card, the ×,
// folding and lighting; a feature gives only what goes inside. Pure: the
// hooks module and the drawing thread both use it.

// A focus move this soon after a card press belongs to that press.
export const FOCUS_GRACE_MS = 600
// Rest after this long with no input.
export const IDLE_MS = 90_000
// Rest after the pointer leaves, unless it returns.
export const LEAVE_MS = 1000
// Keys with the pointer off: rest this long after the last key.
export const KEY_REST_MS = 3000

// A cell and a line on the desktop, in CSS pixels.
export const CELL_PX = 8.4
export const LINE_PX = 20
// The folded row: one line of text (the desktop's card adds a line to it).
export const REST_PX = 24

// The open card's vertical layout, in CSS pixels: the border (2px each side),
// the room above the content, the content area (two lines of the text size,
// at this line-height) and the room under it. Every card is this tall.
export const CARD_BORDER_PX = 4
export const CARD_TOP = 5
export const CARD_FOOT = 20
export const CARD_LINE = 1.7

// The content area: two lines of the text size.
export const cardArea = (textSize: number = SIZE_DEFAULT) => Math.ceil(2 * CARD_LINE * textSize)

// The open card's height, whatever it holds.
export const cardHeight = (textSize: number = SIZE_DEFAULT) => CARD_BORDER_PX + CARD_TOP + cardArea(textSize) + CARD_FOOT

// Where a card is drawn: its slot's width and its height now (open or folded).
export type CardFrame = {
  width: number
  height: number
  isFolded: boolean
  // On the desktop, the cell the card is laid out in (CSS px): the picture
  // reaches a column past the slot at the sides and half a line above and
  // below (a margin of -1 each way) to cover the card the desktop draws
  // around it.
  card?: { ch: number; lh: number }
  // Over the desktop's card: the width the picture is drawn at, in CSS
  // pixels, a little past the slot so the desktop narrows it to the slot exactly.
  drawWidth?: number
}

// The desktop's card around the band: 8px at the sides, and a 40px row less a
// line, halved, above and below; its corners round at 10px.
const DESK_X = 8
const deskY = (lh: number) => Math.max(0, (40 - lh) / 2)

// The width the picture is drawn at for a region of `columns` cells.
export const drawWidthOf = (card: CardFrame['card'], columns: number) => (card && columns > 0 ? (columns + 1) * card.ch : undefined)

// The picture's size, and where the card's own box starts in it.
export const frameOf = (f: CardFrame) => {
  if (!f.card) return { width: f.width, height: f.height, left: 0, top: 0, padX: 0, padY: 0, addX: 0, addY: 0 }
  const { ch, lh } = f.card

  return {
    width: Math.round(f.drawWidth ?? f.width + 2 * ch),
    height: Math.round(f.height + lh),
    left: ch,
    top: lh / 2,
    // Past the desktop card's edge the picture is cut off: left empty.
    padX: Math.max(0, ch - DESK_X),
    padY: Math.max(0, lh / 2 - deskY(lh)),
    // Over the desktop's card: the card grows to its edges, its content where it was.
    addX: DESK_X,
    addY: deskY(lh),
  }
}

// The × hit area, in the card's own pixels from its top left; the folded row's is its whole height.
export const closeArea = (f: Pick<CardFrame, 'height' | 'isFolded'>) => ({ x0: 0, x1: 34, y0: 0, y1: f.isFolded ? f.height : 30 })

// A pointer position, in the region's cells, as pixels in the card's own box.
export const pixelOf = (f: CardFrame, x: number, y: number, columns: number, rows: number) => {
  const box = frameOf(f)

  return {
    px: f.card ? (x + 0.5) * f.card.ch - box.left : ((x + 0.5) * box.width) / columns,
    py: f.card ? (y + 0.5) * f.card.lh - box.top : ((y + 0.5) * box.height) / (rows + 0.5),
  }
}

export const isOnClose = (f: CardFrame, x: number, y: number, columns: number, rows: number) => {
  const { px, py } = pixelOf(f, x, y, columns, rows)
  const a = closeArea(f)

  return px >= a.x0 && px <= a.x1 && py >= a.y0 && py <= a.y1
}

// What a card's Client posts: every click and key, the pointer coming and
// going, and its region's size (the hooks module hit-tests clicks with it).
export type CardMessage =
  | { act: 'pointer'; button: 'left' | 'middle' | 'right'; x: number; y: number; columns?: number; rows?: number }
  | { act: 'key'; key: string }
  | { act: 'size'; columns: number; rows: number }
  | { act: 'hide' }
  | { act: 'enter' }
  | { act: 'leave' }

export const isCardMessage = (value: unknown): value is CardMessage => {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  if (m.act === 'pointer') return typeof m.x === 'number' && typeof m.y === 'number'
  if (m.act === 'key') return typeof m.key === 'string'
  if (m.act === 'size') return typeof m.columns === 'number' && typeof m.rows === 'number'

  return m.act === 'hide' || m.act === 'enter' || m.act === 'leave'
}

export const fontFace = (family: string, weight: number, data: string) =>
  `@font-face { font-family: "${family}"; font-weight: ${weight}; src: url(data:font/woff2;base64,${data}) format("woff2"); }`

// The card's own rules: the box, and the × at its top left, a round 20px
// target, quiet until lit or hovered. A feature's CSS comes after them.
export const CARD_CSS = `
* {box-sizing: border-box;}
.wrap {width: 100%; height: 100%; padding: 1px;}
.band {position: relative; cursor: pointer; user-select: none; -webkit-user-select: none; outline: none;}
.band .x {border: 0; background: none; color: var(--b-dim); cursor: pointer; font-size: 16px; padding: 0 4px; line-height: 1;}
.xabs {position: absolute; top: 4px; left: 6px; z-index: 4; opacity: .55; font-size: 17px; transition: opacity .2s, color .2s, transform .2s;}
.band.active .xabs {font-weight: 700;}
.xabs:hover {opacity: 1;}
.band .xabs {color: var(--b-ink); display: grid; place-items: center; width: 20px; height: 20px; padding: 0; border-radius: 50%;}
.band .xabs.hot {opacity: 1; color: var(--b-ink); background: color-mix(in srgb, var(--b-ink) 20%, transparent);}
.band.band.rest .xabs {top: 50%; margin-top: -10px; font-size: 14px;}
`

// What a feature puts in the card: its classes and inline style on the card's
// box, its HTML inside, and its CSS (fonts and rules).
export type CardContent = {
  classes: string
  style: string
  html: string
  css: string
  hoverClose?: boolean
}

// The card's box: the feature's content with the × first.
export const cardHtml = (f: CardFrame, c: CardContent) => {
  const box = frameOf(f)
  const over = f.card ? `;--ax:${box.addX}px;--ay:${box.addY}px;border-radius:10px` : ''

  return `<div class="band ${c.classes}" data-band="" style="${c.style}${over}"><span class="x xabs${c.hoverClose ? ' hot' : ''}">×</span>${c.html}</div>`
}

// The card as SVG markup.
export const cardSvg = (f: CardFrame, c: CardContent) => {
  const box = frameOf(f)
  const pad = f.card ? ` style="padding:${box.padY}px ${box.padX}px"` : ''
  // Over the desktop's card the picture is narrowed to the slot, a hair: it
  // stretches to fill rather than leave a strip of the card.
  const size = `width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}"${f.card ? ' preserveAspectRatio="none"' : ''}`

  return `<svg xmlns="http://www.w3.org/2000/svg" ${size}>`
    + `<style><![CDATA[${CARD_CSS}\n${c.css}]]></style>`
    + `<foreignObject x="0" y="0" width="${box.width}" height="${box.height}"><div xmlns="http://www.w3.org/1999/xhtml" class="wrap"${pad}>${cardHtml(f, c)}</div></foreignObject></svg>`
}

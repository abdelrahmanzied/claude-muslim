// The desktop athan card: a full-width card above the prompt with a photo
// behind the call, built the way the athkar band is: one SVG document holding
// HTML and CSS in a foreignObject, with the font embedded as a base64
// @font-face and the photo as a base64 data URL in CSS. Drawn in the Svg
// sandboxed document. Pure; install.tsx reads the photo and shows it.

import { arabicDigits, athanText, IN_MS } from '../../shared/pray/line.ts'
import type { Pray } from '../../shared/pray/names.ts'
import { ARUQAA_BOLD } from './card-font.ts'

// A cell on the desktop and a line, in CSS pixels (the athkar band's numbers).
export const CELL_PX = 8.4
export const LINE_PX = 20
// The card's own height, and the line the desktop's card around it adds.
export const CARD_HEIGHT = 77 + LINE_PX
// How long the card stays when nobody closes it: the call's window.
export const CARD_MS = IN_MS

// The photo is a 640 by 80 strip cut from the original, a little above its
// middle; `cover` fits it to the card's width.
const PHOTO_Y = '50%'
// The × the desktop's Button draws sits at this spot (CSS px); the circle behind it is drawn here.
const CLOSE_LEFT = 8
const CLOSE_TOP = 17

// The width the picture is drawn at: the body's columns and a cell past each side.
export const cardWidth = (columns: number): number => Math.round((columns + 2) * CELL_PX)

// The card as SVG markup. `time` is the clock text, e.g. `15:59`.
export const cardSvg = (photoBase64: string, pray: Pray, time: string, width: number): string => {
  const css = [
    `@font-face { font-family: "Aref Ruqaa"; font-weight: 700; src: url(data:font/woff2;base64,${ARUQAA_BOLD}) format("woff2"); }`,
    '* { box-sizing: border-box; margin: 0; }',
    `.card { position: relative; width: 100%; height: 100%; border-radius: 10px; overflow: hidden; direction: rtl; color: #fff; font-family: "Aref Ruqaa", serif; font-weight: 700;`,
    `  display: flex; flex-direction: column; justify-content: center; padding: 0 36px;`,
    `  background: linear-gradient(rgba(0,0,0,.35), rgba(0,0,0,.7)), url(data:image/jpeg;base64,${photoBase64}) center ${PHOTO_Y} / cover; }`,
    '.main { font-size: 26px; line-height: 1.5; }',
    '.time { font-size: 17px; line-height: 1.4; color: rgba(255,255,255,.85); }',
    `.close { position: absolute; left: ${CLOSE_LEFT}px; top: ${CLOSE_TOP}px; width: 26px; height: 26px; border-radius: 50%; background: rgba(0,0,0,.45); border: 1px solid rgba(255,255,255,.5); }`,
  ].join('\n')
  const at = arabicDigits(time)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${CARD_HEIGHT}" viewBox="0 0 ${width} ${CARD_HEIGHT}" preserveAspectRatio="none">`
    + `<style><![CDATA[${css}]]></style>`
    + `<foreignObject x="0" y="0" width="${width}" height="${CARD_HEIGHT}"><div xmlns="http://www.w3.org/1999/xhtml" class="card">`
    + `<div class="close"></div><div class="main">${athanText(pray)}</div><div class="time">${at}</div></div></foreignObject></svg>`
}

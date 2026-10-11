// The desktop test card for `/salah athan test`: a small card with a photo
// behind the prayer's call, drawn as an interactive Svg (so the bar can
// animate). Pure; install.tsx reads the photo and shows it.

import { ARABIC } from '../../shared/pray/names.ts'
import type { Prayer } from '../../shared/pray/names.ts'
import { arabicDigits } from '../../shared/pray/line.ts'

export const CARD_WIDTH = 320
export const CARD_HEIGHT = 80
// How long the card stays; the bar shrinks over exactly this time.
export const CARD_MS = 8000

// The photo file is 320 px wide and 255 px tall; it is placed so that
// the card's 80 px show the band around 28% from the top.
const PHOTO_HEIGHT = 255
const PHOTO_Y = -Math.round((PHOTO_HEIGHT - CARD_HEIGHT) * 0.28)
const ORANGE = 'rgb(215,119,87)'

// The card as SVG markup. `time` is the clock text, e.g. `15:59`.
export const testCardSvg = (photoBase64: string, prayer: Prayer, time: string): string => {
  const name = ARABIC[prayer]
  const font = "font-family=\"'Aref Ruqaa', 'Amiri', 'Geeza Pro', serif\" fill=\"#fff\" text-anchor=\"middle\""

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">`,
    '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="#000" stop-opacity="0.35"/><stop offset="1" stop-color="#000" stop-opacity="0.8"/>',
    '</linearGradient></defs>',
    `<image href="data:image/jpeg;base64,${photoBase64}" x="0" y="${PHOTO_Y}" width="${CARD_WIDTH}" height="${PHOTO_HEIGHT}"/>`,
    `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#g)"/>`,
    `<text x="${CARD_WIDTH / 2}" y="36" font-size="22" ${font}>حان وقت صلاة ${name}</text>`,
    `<text x="${CARD_WIDTH / 2}" y="60" font-size="15" ${font} fill-opacity="0.85">${name} · ${arabicDigits(time)}</text>`,
    `<rect x="0" y="${CARD_HEIGHT - 2}" width="${CARD_WIDTH}" height="2" fill="${ORANGE}">`,
    `<animate attributeName="width" from="${CARD_WIDTH}" to="0" dur="${CARD_MS / 1000}s" fill="freeze"/>`,
    '</rect>',
    '</svg>',
  ].join('')
}

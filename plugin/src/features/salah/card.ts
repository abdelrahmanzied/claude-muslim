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
import { isFriday } from '../../shared/friday/index.ts'
import { ayahInBrackets, jumuahVerse } from '../../shared/friday/jumuah-ayah.ts'
import { withTashkeel } from '../../shared/arabic/visual.ts'
import { TAJAWAL_JUMUAH } from './jumuah-font.ts'

// The «ابدأ أذكار بعد الصلاة» button is on every athan card but Jumu'ah's (Dhuhr on a Friday): the person goes to the prayer first.
export const offersAfterSalah = (pray: Pray, at: number): boolean => !(pray === 'dhuhr' && isFriday(at))

// The verse the card of this prayer shows (Dhuhr on a Friday only), with or without tashkeel as the setting says.
export const cardVerse = (pray: Pray, at: number, tashkeel: boolean): AthanCardProps['verse'] => {
  const v = jumuahVerse(pray, at)

  return v ? { text: withTashkeel(v.text, tashkeel), ref: v.ref } : undefined
}

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
  // The pray's time (ms): on a Friday its Dhuhr reads الجمعة.
  at: number
  // The clock text, e.g. `15:59`.
  time: string
  // The photo, base64 JPEG.
  photo: string
  // The slot's width and the desktop's cell, in CSS pixels.
  width: number
  card: { ch: number; lh: number }
  // Jumu'ah's verse (the card is Dhuhr on a Friday): its words, already with or without tashkeel, and its reference.
  verse?: { text: string; ref: string }
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
  '.band.athan { height: 100%; border-radius: 10px; overflow: hidden; direction: rtl; color: #fff; --b-ink: #fff; --b-dim: rgba(255,255,255,.75);',
  '  font-family: "Aref Ruqaa", serif; font-weight: 700; display: flex; flex-direction: column; justify-content: center;',
  '  padding: var(--ay, 0px) calc(36px + var(--ax, 0px));',
  `  background: linear-gradient(rgba(0,0,0,.35), rgba(0,0,0,.7)), url(data:image/jpeg;base64,${photo}) center 50% / cover; }`,
  '.athan .main { font-size: 26px; line-height: 1.5; }',
  '.athan.rest { flex-direction: row; justify-content: flex-start; align-items: center; gap: 12px; white-space: nowrap; }',
  '.athan.rest .main, .athan.rest .time { font-size: 17px; line-height: 1; }',
  `.athan .start { position: absolute; left: calc(${START_LEFT}px + var(--ax, 0px)); top: 50%; transform: translateY(-50%);`,
  `  width: ${START_WIDTH}px; height: ${START_HEIGHT}px; display: flex; align-items: center; direction: ltr;`,
  '  font: 700 15px/1 "Aref Ruqaa", serif; color: #fff; white-space: nowrap; cursor: pointer; text-shadow: 0 1px 3px rgba(0,0,0,.8); }',
  '.athan .start-label { width: 93px; direction: rtl; }',
  '.athan .start-arrow { font: 400 12px/1 monospace; white-space: pre; }',
  '.athan .start.hot { color: var(--start-accent); filter: brightness(1.15); }',
  '.athan .time { font-size: 17px; line-height: 1.4; color: rgba(255,255,255,.85); }',
].join('\n')

// Jumu'ah's verse sits on the left of the open card, where the start button is on the other prayers; the card never grows
// for it. The widths below are measured in the real fonts (headless Chrome): the verse in ﴿ ﴾ on one line at 13px with its
// tashkeel, the widest head (the call at 26px) and the room one wrapped line may waste at the end of a word.
export const VERSE_PX = 590
export const HEAD_PX = 165
export const VERSE_WORD_PX = 60
const VERSE_GAP = 14

// The room beside the head, in the card's own pixels: the picture's width less the wrap, the desktop's padding and the card's own side padding.
export const verseRoom = (f: CardFrame) => {
  const box = frameOf(f)

  return box.width - 2 * box.padX - 2 - 2 * (36 + box.addX) - HEAD_PX - VERSE_GAP
}

// Folded, or an open card too narrow for the verse in two lines: it slides, slowly, in one line. Otherwise it is two lines beside the head.
export const versePlacement = (f: CardFrame): 'beside' | 'slide' =>
  !f.isFolded && verseRoom(f) >= VERSE_PX / 2 + VERSE_WORD_PX ? 'beside' : 'slide'

const verseCss = () => [
  fontFace('Tajawal', 400, TAJAWAL_JUMUAH),
  '.athan.verse { flex-direction: row; justify-content: flex-start; align-items: center; gap: ' + VERSE_GAP + 'px; }',
  '.athan.verse .head { flex: none; display: flex; flex-direction: column; justify-content: center; white-space: nowrap; }',
  '.athan.verse.rest .head { flex-direction: row; align-items: center; gap: 12px; }',
  '.athan .side { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }',
  '.athan .ayah { font: 400 13px/1.55 Tajawal, sans-serif; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.8); text-align: right; direction: rtl; }',
  '.athan .ref { font: 400 11.5px/1.3 Tajawal, sans-serif; color: rgba(255,255,255,.78); white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,.8); }',
  // The slide: the verse's start is at the right edge at once and the text moves right, so later words come in from the left; faded at both ends.
  '.athan .track { flex: 1; min-width: 0; overflow: hidden; -webkit-mask-image: linear-gradient(to left, transparent, #000 18px, #000 calc(100% - 18px), transparent); mask-image: linear-gradient(to left, transparent, #000 18px, #000 calc(100% - 18px), transparent); }',
  '.athan .move { display: inline-flex; gap: 10px; align-items: baseline; white-space: nowrap; padding-left: 100%; animation: jslide 26s linear infinite; }',
  '.athan .move .ayah { font-size: 14px; }',
  '@keyframes jslide { from { transform: translateX(0); } to { transform: translateX(100%); } }',
  // No motion asked for: nothing slides, so only the reference stays (a clipped verse would cut words).
  '@media (prefers-reduced-motion: reduce) { .athan .move { animation: none; padding-left: 0; } .athan .move .ayah { display: none; } }',
].join('\n')

const verseHtml = (p: AthanCardProps, f: CardFrame, call: string) => {
  const text = ayahInBrackets(p.verse!.text)
  const ref = p.verse!.ref
  if (versePlacement(f) === 'beside') return `<div class="head">${call}</div><div class="side"><div class="ayah">${text}</div><div class="ref">${ref}</div></div>`

  return `<div class="head">${call}</div><div class="track"><div class="move"><span class="ayah">${text}</span><span class="ref">${ref}</span></div></div>`
}

export const athanSvg = (p: AthanCardProps, view: Pick<CardView, 'hoverClose' | 'columns' | 'hoverAction'>) => {
  const frame = athanFrame(p, view.columns)
  const call = `<div class="main">${athanText(p.pray, p.at)}</div><div class="time">${arabicDigits(p.time)}</div>`

  return cardSvg(frame, {
    classes: `athan active${p.isFolded ? ' rest' : ''}${p.verse ? ' verse' : ''}`,
    style: '',
    html: p.verse ? verseHtml(p, frame, call) : `${p.canStart ? `<span class="start${view.hoverAction ? ' hot' : ''}"><span class="start-arrow">← </span><span class="start-label">${START_LABEL}</span></span>` : ''}${call}`,
    css: css(p.photo, p.accent ?? 'orange') + (p.verse ? '\n' + verseCss() : ''),
    hoverClose: view.hoverClose,
  })
}

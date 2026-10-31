// How every desktop drawing lays out its text, in any language. Pure: no $.
//
// The rule (DESIGN.md §4): text is never clipped by a feature's own CSS. Marks
// stacked above and below a letter (Arabic tashkeel, Vietnamese tone marks,
// Devanagari matras) reach far past the font's em box; a clipping box with a
// tight line-height cuts them or leaves stray dots (Chrome 152 does). So all
// clipping of text (overflow, text-overflow) lives in the classes below, which
// always carry a roomy line-height, and a feature puts these classes on its text
// instead of writing its own `overflow:hidden; text-overflow:ellipsis`.
//
// A feature that needs its row to keep a tighter look keeps the same height by
// moving the box with a negative block margin of (TEXT_LINE - old line-height) / 2 em;
// it never lowers the line-height of these classes.

import { directionOf, type Direction } from './direction.ts'

export { directionOf, type Direction }

// The line-height of all drawn text, as a multiple of its font size. Never under MIN_TEXT_LINE.
export const TEXT_LINE = 2
export const MIN_TEXT_LINE = 1.8

export type TextKind = 'line' | 'wrap'

export const CLASS = { text: 'tx', line: 'tx-line', wrap: 'tx-wrap' } as const

// The classes of a kind: `tx tx-line` (one line, cut with an ellipsis) or `tx tx-wrap` (wraps, never cut).
export const textClass = (kind: TextKind = 'line'): string => `${CLASS.text} ${CLASS[kind]}`

// The rules of the classes. Every drawing's CSS includes this once.
export const textCss = (): string =>
  `.${CLASS.text}{line-height:${TEXT_LINE};unicode-bidi:isolate}`
  + `.${CLASS.line}{display:block;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`
  + `.${CLASS.wrap}{white-space:normal;overflow-wrap:anywhere}`

// The negative block margin that gives back what the shared line-height adds to a line that was `was` tall, as a multiple of its font size.
export const tightMargin = (was: number): string => `${Math.round(-(TEXT_LINE - was) / 2 * 1000) / 1000}em`

export const escapeText = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export type DrawTextOptions = {
  // The text's language tag (`ar`, `fa`, `ur`, `tr`, `vi`, `id`, `en`); the direction follows it, else the text itself.
  lang?: string
  kind?: TextKind
  // The feature's own class(es), for its color, size and place; never for clipping or line-height.
  className?: string
  tag?: 'span' | 'div'
  // The text is markup its caller already escaped (it may hold <bdi>); the direction is then only what `dir` says.
  raw?: boolean
  dir?: Direction
  // Inline style for a value only the drawing knows (a fitted font size); never for clipping or line-height.
  style?: string
}

// A string as markup: escaped, with its direction and language, in the shared text classes.
export const drawText = (text: string, o: DrawTextOptions = {}): string => {
  const tag = o.tag ?? 'span'
  const dir = o.dir ?? (o.raw ? undefined : directionOf(text, o.lang))
  const dirAttr = dir ? ` dir="${dir}"` : ''
  const lang = o.lang ? ` lang="${escapeText(o.lang)}"` : ''
  const style = o.style ? ` style="${escapeText(o.style)}"` : ''

  return `<${tag} class="${o.className ? `${o.className} ` : ''}${textClass(o.kind)}"${dirAttr}${lang}${style}>${o.raw ? text : escapeText(text)}</${tag}>`
}

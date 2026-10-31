// A small CSS reader for the guard tests: the rules of the <style> blocks of a drawing,
// and the inline style attributes of its markup. Not a full parser; it reads what our
// own builders write (rules, @media, @keyframes, @font-face).
export type Rule = { selector: string; decls: Record<string, string> }

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

const decls = (body: string): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const part of body.split(';')) {
    const i = part.indexOf(':')
    if (i > 0) out[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim().replace(/\s*!important$/, '')
  }

  return out
}

const block = (css: string, from: number): number => {
  let depth = 0
  for (let i = from; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}' && --depth === 0) return i
  }

  return css.length
}

export const rulesOf = (css: string): Rule[] => {
  const out: Rule[] = []
  const text = stripComments(css)
  let i = 0
  while (i < text.length) {
    const open = text.indexOf('{', i)
    if (open < 0) break
    const head = text.slice(i, open).trim()
    const close = block(text, open)
    const inner = text.slice(open + 1, close)
    if (head.startsWith('@media') || head.startsWith('@supports')) out.push(...rulesOf(inner))
    else if (!head.startsWith('@')) out.push({ selector: head.replace(/\s+/g, ' '), decls: decls(inner) })
    i = close + 1
  }

  return out
}

// The CSS of every <style> block of a document (CDATA unwrapped).
export const styleOf = (svg: string): string =>
  [...svg.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => (m[1] ?? '').replace('<![CDATA[', '').replace(']]>', '')).join('\n')

// The inline style attribute values of a document's markup.
export const inlineStyles = (svg: string): string[] => [...svg.matchAll(/ style="([^"]*)"/g)].map(m => m[1] ?? '')

// Whether a declaration set clips what is inside it or cuts its text.
export const clips = (d: Record<string, string>): string[] => {
  const found: string[] = []
  for (const [name, value] of Object.entries(d)) {
    if (/^overflow(-x|-y)?$/.test(name) && /\b(hidden|clip|auto|scroll)\b/.test(value)) found.push(`${name}:${value}`)
    else if (name === 'text-overflow' && value !== 'clip') found.push(`${name}:${value}`)
    else if (name === 'clip-path' && value !== 'none') found.push(`${name}:${value}`)
    else if (name === 'contain' && /\b(paint|strict|content)\b/.test(value)) found.push(`${name}:${value}`)
  }

  return found
}

// A line-height as a multiple of the rule's font size when both are known; unitless values are the multiple.
export const lineHeightRatio = (d: Record<string, string>): number | undefined => {
  const lh = d['line-height']
  if (lh === undefined) return undefined
  if (/^[\d.]+$/.test(lh)) return Number(lh)
  const px = /^([\d.]+)px$/.exec(lh)
  const fs = /^([\d.]+)px$/.exec(d['font-size'] ?? '')

  return px && fs ? Number(px[1]) / Number(fs[1]) : undefined
}

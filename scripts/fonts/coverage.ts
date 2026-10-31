// Developer tool only: Node 24. Never imported by plugin/hooks/register.tsx.
//
//   npm run fonts            writes plugin/src/shared/font/coverage.ts
//
// Reads each WOFF2 font the drawings embed, takes the code points its cmap table maps to a
// glyph, and writes them as ranges. The font coverage test (plugin/tests/shared/font/coverage.test.ts)
// checks every shown text against this list. Run it again whenever an embedded font changes.
// @ts-nocheck (a developer script run by Node 24; the repo's tsc does not cover it)
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { brotliDecompressSync } from 'node:zlib'
import { TAJAWAL_BOLD_WOFF2, TAJAWAL_REGULAR_WOFF2 } from '../../plugin/src/shared/font/tajawal-embedded.ts'
import { AREF_RUQAA_BOLD, TAJAWAL_BOLD, TAJAWAL_REGULAR } from '../../plugin/src/features/athkar/fonts.ts'
import { ARUQAA_BOLD } from '../../plugin/src/features/salah/card-font.ts'

// The faces the drawings embed, by the name the coverage test uses.
const FONTS = {
  'tajawal-pane-400': TAJAWAL_REGULAR_WOFF2,
  'tajawal-pane-700': TAJAWAL_BOLD_WOFF2,
  'tajawal-band-400': TAJAWAL_REGULAR,
  'tajawal-band-700': TAJAWAL_BOLD,
  'aref-ruqaa-band-700': AREF_RUQAA_BOLD,
  'aref-ruqaa-athan-700': ARUQAA_BOLD,
}

const OUT = resolve('plugin/src/shared/font/coverage.ts')

// The 63 table tags a WOFF2 directory can name by index (W3C WOFF2, 5.1).
const KNOWN = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill']

const cmapOf = (base64: string): Set<number> => {
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.toString('latin1', 0, 4) !== 'wOF2') throw new Error('not a WOFF2 font')
  const tables = bytes.readUInt16BE(12)
  const compressed = bytes.readUInt32BE(20)
  let at = 48
  const dir = []
  for (let i = 0; i < tables; i++) {
    const flags = bytes[at++]
    const index = flags & 63
    const tag = index === 63 ? bytes.toString('latin1', at, (at += 4)) : KNOWN[index]
    const version = flags >> 6
    const base128 = () => {
      let value = 0
      for (let n = 0; n < 5; n++) {
        const b = bytes[at++]
        value = value * 128 + (b & 127)
        if (!(b & 128)) break
      }

      return value
    }
    const length = base128()
    const transformed = tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0
    dir.push({ tag, length: transformed ? base128() : length })
  }
  const data = brotliDecompressSync(bytes.subarray(at, at + compressed))
  let offset = 0
  let cmap
  for (const t of dir) {
    if (t.tag === 'cmap') cmap = data.subarray(offset, offset + t.length)
    offset += t.length
  }
  if (!cmap) throw new Error('no cmap table')
  const points = new Set<number>()
  const count = cmap.readUInt16BE(2)
  for (let i = 0; i < count; i++) {
    const platform = cmap.readUInt16BE(4 + i * 8)
    const encoding = cmap.readUInt16BE(6 + i * 8)
    const sub = cmap.readUInt32BE(8 + i * 8)
    if (!(platform === 0 || platform === 3 && (encoding === 1 || encoding === 10))) continue
    const format = cmap.readUInt16BE(sub)
    if (format === 4) {
      const segs = cmap.readUInt16BE(sub + 6) / 2
      const ends = sub + 14, starts = ends + segs * 2 + 2, deltas = starts + segs * 2, ranges = deltas + segs * 2
      for (let s = 0; s < segs; s++) {
        const end = cmap.readUInt16BE(ends + s * 2), start = cmap.readUInt16BE(starts + s * 2)
        const delta = cmap.readInt16BE(deltas + s * 2), rangeOffset = cmap.readUInt16BE(ranges + s * 2)
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let glyph
          if (rangeOffset === 0) glyph = (c + delta) & 0xffff
          else {
            const g = cmap.readUInt16BE(ranges + s * 2 + rangeOffset + (c - start) * 2)
            glyph = g === 0 ? 0 : (g + delta) & 0xffff
          }
          if (glyph) points.add(c)
        }
      }
    } else if (format === 12) {
      const groups = cmap.readUInt32BE(sub + 12)
      for (let g = 0; g < groups; g++) {
        const start = cmap.readUInt32BE(sub + 16 + g * 12), end = cmap.readUInt32BE(sub + 20 + g * 12), glyph = cmap.readUInt32BE(sub + 24 + g * 12)
        for (let c = start; c <= end; c++) if (glyph + (c - start)) points.add(c)
      }
    }
  }

  return points
}

const ranges = (points: Set<number>) => {
  const sorted = [...points].sort((a, b) => a - b)
  const out = []
  for (const p of sorted) {
    const last = out[out.length - 1]
    if (last && last[1] + 1 === p) last[1] = p
    else out.push([p, p])
  }

  return out
}

const lines = Object.entries(FONTS).map(([name, woff2]) => {
  const r = ranges(cmapOf(woff2))
  console.log(`${name}: ${r.reduce((n, [a, b]) => n + b - a + 1, 0)} code points in ${r.length} ranges`)

  return `  '${name}': [${r.map(([a, b]) => `[0x${a.toString(16)}, 0x${b.toString(16)}]`).join(', ')}],`
})

await writeFile(OUT, `// Generated by scripts/fonts/coverage.ts (npm run fonts). Do not edit by hand.
// The code points each embedded font draws, as inclusive [from, to] ranges, read from its cmap table.
// plugin/tests/shared/font/coverage.test.ts checks every shown text against these.
export type CodePointRanges = readonly (readonly [number, number])[]

export const FONT_COVERAGE: Readonly<Record<string, CodePointRanges>> = {
${lines.join('\n')}
}

export const covers = (font: string, codePoint: number): boolean => (FONT_COVERAGE[font] ?? []).some(([from, to]) => codePoint >= from && codePoint <= to)
`, 'utf8')
console.log(`wrote ${OUT}`)

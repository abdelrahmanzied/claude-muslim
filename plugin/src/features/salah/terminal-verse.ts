// Jumu'ah's verse on the terminal: after the athan line when it all fits the width, else on its own lines
// under it. Words are never cut: the verse breaks only between words, and a word wider than the line stays whole.
// The terminal drops tashkeel, so widths are of the bare letters. Each row goes through the shared Arabic path
// (plugin/src/shared/arabic) on its own, as the athan line does. Pure: no $.

import { stripTashkeel } from '../../shared/arabic/visual.ts'
import { ayahInBrackets, jumuahVerse } from '../../shared/friday/jumuah-ayah.ts'
import type { Pray } from '../../shared/pray/names.ts'

const width = (text: string): number => Array.from(stripTashkeel(text).normalize('NFC')).length

// Greedy rows of whole words, each at most `columns` wide (a longer word keeps a row to itself).
export const wordRows = (text: string, columns: number): string[] => {
  const rows: string[] = []
  let row = ''
  for (const word of text.split(' ')) {
    if (row && width(`${row} ${word}`) > columns) {
      rows.push(row)
      row = word
    } else row = row ? `${row} ${word}` : word
  }
  if (row) rows.push(row)

  return rows
}

// `inline` is the verse and its reference for the athan row itself (after the label, before the ×), or null when
// they do not fit beside `label` on `columns`; `rows` are the lines under the athan line otherwise.
export type TerminalVerse = { inline: string | null; rows: string[] }

// ☾, the label and the × take a gap each: `taken` is what the row already holds besides the verse, with those gaps.
export const terminalVerse = (pray: Pray, at: number, columns: number, label: string, isFolded: boolean): TerminalVerse | null => {
  const v = jumuahVerse(pray, at)
  if (!v) return null
  const verse = ayahInBrackets(v.text)
  const flat = `${verse} ${v.ref}`
  // ☾ + gap + label + gap + verse + gap + ×
  if (isFolded && 1 + 1 + width(label) + 1 + width(flat) + 1 + 1 <= columns) return { inline: flat, rows: [] }

  return { inline: null, rows: [...wordRows(verse, columns), v.ref] }
}

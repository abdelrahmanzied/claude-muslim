import { expect, test } from 'claude-code/testing'
import { stripTashkeel } from '../../src/shared/arabic/visual.ts'
import { ayahInBrackets, JUMUAH_AYAH, JUMUAH_REF } from '../../src/shared/friday/jumuah-ayah.ts'
import { terminalVerse, wordRows } from '../../src/features/salah/terminal-verse.ts'

const FRIDAY = new Date(2026, 9, 9, 12, 30).getTime(), SATURDAY = new Date(2026, 9, 10, 12, 30).getTime()
const LABEL = 'حان وقت صلاة الجمعة'
const bare = (s: string) => Array.from(stripTashkeel(s).normalize('NFC')).length

test('rows break only between words, fit the width, and lose no word', () => {
  const verse = ayahInBrackets(JUMUAH_AYAH)
  for (const columns of [20, 40, 60, 80, 100, 160]) {
    const rows = wordRows(verse, columns)
    expect(rows.join(' ')).toBe(verse)
    for (const row of rows) if (row.includes(' ')) expect(bare(row)).toBeLessThanOrEqual(columns)
  }
  // A word wider than the line stays whole on its row.
  expect(wordRows('aaaaaaaaaa bb', 4)).toEqual(['aaaaaaaaaa', 'bb'])
})

test('on a Friday Dhuhr the verse is inline when it fits beside the athan line, else on its own rows, then the reference', () => {
  const wide = terminalVerse('dhuhr', FRIDAY, 200, LABEL, true)!
  expect(wide.inline).toBe(`${ayahInBrackets(JUMUAH_AYAH)} ${JUMUAH_REF}`)
  expect(wide.rows).toEqual([])
  const narrow = terminalVerse('dhuhr', FRIDAY, 80, LABEL, true)!
  expect(narrow.inline).toBeNull()
  expect(narrow.rows.at(-1)).toBe(JUMUAH_REF)
  expect(narrow.rows.slice(0, -1).join(' ')).toBe(ayahInBrackets(JUMUAH_AYAH))
  // The inline row is only for the folded line: the minaret stage puts it on rows.
  expect(terminalVerse('dhuhr', FRIDAY, 200, LABEL, false)!.inline).toBeNull()
})

test('the inline decision counts the whole row: ☾, the label, the verse, the reference and the ×', () => {
  const need = 1 + 1 + bare(LABEL) + 1 + bare(`${ayahInBrackets(JUMUAH_AYAH)} ${JUMUAH_REF}`) + 1 + 1
  expect(terminalVerse('dhuhr', FRIDAY, need, LABEL, true)!.inline).not.toBeNull()
  expect(terminalVerse('dhuhr', FRIDAY, need - 1, LABEL, true)!.inline).toBeNull()
})

test('no verse for another prayer or another day', () => {
  expect(terminalVerse('asr', FRIDAY, 200, 'حان وقت صلاة العصر', true)).toBeNull()
  expect(terminalVerse('dhuhr', SATURDAY, 200, 'حان وقت صلاة الظهر', true)).toBeNull()
})

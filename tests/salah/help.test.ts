import { expect, test } from 'claude-code/testing'

import { salahHelp } from '../../src/features/salah/help.ts'
import { helpTable } from '../../src/table.ts'

test('the table has a header and one row per command', { options: { athkar: false } }, async () => {
  const [title, blank, ...lines] = salahHelp().split('\n')

  expect([title, blank]).toEqual(['**Muslim › Salah › Help**', ''])

  expect(lines.slice(0, 2)).toEqual(['| Command | Description | Options |', '| --- | --- | --- |'])
  expect(lines.every(line => line.startsWith('|') && line.endsWith('|'))).toBe(true)
  expect(lines.length).toBe(2 + 8)
  expect(lines).toContain('| `/salah athan` | حان وقت صلاة … when a pray comes in | `on` (default) · `off` |')
  expect(lines).toContain('| `/salah demo` | Preview Fajr at 05:00 without a city; desktop open 5 s then folded 3 s, terminal rise then folded 3 s; changes no settings or saved state | — |')
})

test('the command stands alone, its options in their own column; no options shows a dash', { options: { athkar: false } }, async () => {
  expect(helpTable([['/salah athan', 'x', '`on` · `off`'], ['/salah', 'y', '']])).toContain('| `/salah athan` | x | `on` · `off` |\n| `/salah` | y | — |')
})

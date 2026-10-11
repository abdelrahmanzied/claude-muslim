import { expect, test } from 'claude-code/testing'

import { salahHelp } from '../../src/features/salah/help.ts'
import { commandTable } from '../../src/table.ts'

test('the table has a header and one row per command', { options: { athkar: false } }, async () => {
  const [title, blank, ...lines] = salahHelp().split('\n')

  expect([title, blank]).toEqual(['**Muslim › Salah › Help**', ''])

  expect(lines.slice(0, 2)).toEqual(['| Command | What it does |', '| --- | --- |'])
  expect(lines.every(line => line.startsWith('|') && line.endsWith('|'))).toBe(true)
  expect(lines.length).toBe(2 + 12)
})

test('two spellings of a command are two code spans', { options: { athkar: false } }, async () => {
  expect(commandTable([['/salah athan on` · `off', 'x']])).toContain('| `/salah athan on` · `off` | x |')
})

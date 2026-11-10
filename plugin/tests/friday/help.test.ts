import { expect, test } from 'claude-code/testing'

import { fridayHelp, FRIDAY_COMMANDS } from '../../src/features/friday/help.ts'

test('the table has a header and one row per command', () => {
  const [title, blank, ...lines] = fridayHelp().split('\n')
  expect([title, blank]).toEqual(['**Muslim › Friday › Help**', ''])
  expect(lines.slice(0, 2)).toEqual(['| Command | Description | Options |', '| --- | --- | --- |'])
  expect(lines.length).toBe(2 + FRIDAY_COMMANDS.length)
  expect(FRIDAY_COMMANDS.map(row => row[0])).toEqual(['/friday', '/friday help', '/friday salawat', '/friday alkahf', '/friday demo'])
})

test('salawat and alkahf take on and off', () => {
  const lines = fridayHelp().split('\n')
  expect(lines.some(line => line.startsWith('| `/friday salawat` |') && line.endsWith('| `on` (default) · `off` |'))).toBe(true)
  expect(lines.some(line => line.startsWith('| `/friday alkahf` |') && line.includes('`on` (default) · `off`'))).toBe(true)
})

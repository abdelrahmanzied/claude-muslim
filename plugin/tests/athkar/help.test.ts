import { expect, test } from 'claude-code/testing'
import { athkarHelp } from '../../src/features/athkar/help.ts'
import { muslimHelp } from '../../src/help.ts'

test('the style row tells a terminal to match Claude Code\'s theme, in /athkar help and /muslim help', () => {
  const note = 'Terminal: if the words are hard to read, set Claude Code\'s /theme to match the terminal (light or dark)'
  expect(athkarHelp()).toContain(note)
  expect(muslimHelp()).toContain(note)
  expect(muslimHelp('athkar')).toContain(note)
})

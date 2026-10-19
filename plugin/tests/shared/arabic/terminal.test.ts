import { expect, test } from 'claude-code/testing'
import { terminalIdFromEnv } from '../../../src/shared/arabic/terminal.ts'

for (const [env, id] of [
  [{ VTE_VERSION: '7', WT_SESSION: undefined }, 'VTE'],
  [{ KITTY_WINDOW_ID: '1', WT_SESSION: undefined }, 'kitty'],
  [{ OS: 'Windows_NT', WT_SESSION: undefined }, 'WindowsConsole'],
  [{ WT_SESSION: '' }, 'WindowsTerminal'],
  [{ WT_SESSION: 'abc' }, 'WindowsTerminal'],
] as const) test(`terminal detection: ${id} ${JSON.stringify(env)}`, () => {
  expect(terminalIdFromEnv(env)).toBe(id)
})

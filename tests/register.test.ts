import { expect, test } from 'claude-code/testing'

const muslim = (args: string) => ({
  command: 'muslim',
  args,
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 80 },
})

test('/muslim answers with version and a hint', async $ => {
  const ran = await $.command.run(muslim(''))
  expect(ran.text).toBe('muslim v0.2.0\n\n/muslim terminal-arabic — choose how Arabic shows in this terminal (applies to all features)\n\nHelp: /muslim help')
})

test('/muslim help lists the terminal picker and thikr', async $ => {
  const all = (await $.command.run(muslim('help'))).text
  expect(all).toContain('/muslim terminal-arabic — choose how Arabic shows in this terminal (applies to all features)')
  expect(all).toContain('/thikr')
  expect(all).not.toContain('/muslim arabic-fix')
  expect((await $.command.run(muslim('help terminal-arabic'))).text).toBe('/muslim terminal-arabic — choose how Arabic shows in this terminal (applies to all features)')
})

test('the old arabic-fix subcommand no longer handles or changes settings', async ($, on) => {
  const writes: unknown[] = []
  on('config.set', async (_$, e) => (writes.push(e), { value: e.value }))
  on('command.run', { command: 'muslim' }, async () => ({ text: 'passed through' }))
  const result = await $.command.run(muslim('arabic-fix on'))
  expect(result.text).toBe('passed through')
  expect(writes).toEqual([])
})

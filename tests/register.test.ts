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

test('/muslim help shows every feature\'s table; with a feature, only its own', async $ => {
  const all = (await $.command.run(muslim('help'))).text
  const salah = (await $.command.run(muslim('help salah'))).text
  const thikr = (await $.command.run(muslim('help thikr'))).text

  expect(all).toContain('/thikr speed auto')
  expect(all).toContain('/salah city')
  expect(all).toContain('/muslim terminal-arabic')
  expect((await $.command.run(muslim('help terminal-arabic'))).text).toBe('/muslim terminal-arabic — choose how Arabic shows in this terminal (applies to all features)')
  expect(salah).toContain('/salah city')
  expect(salah).not.toContain('/thikr')
  expect(thikr).toContain('/thikr mode')
  expect(thikr).not.toContain('/salah')
  expect((await $.command.run(muslim('help quran'))).text).toContain('Features: thikr, salah, terminal-arabic')
})

test('session start clears a status line left by an earlier version', async ($, on) => {
  const seen: Array<string | undefined> = []
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  on('ui.status', async (_$, e) => (seen.push(e.text), { value: undefined }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  expect(seen).toEqual([undefined])
})

test('the old arabic-fix subcommand no longer handles or changes settings', async ($, on) => {
  const writes: unknown[] = []
  on('config.set', async (_$, e) => (writes.push(e), { value: e.value }))
  on('command.run', { command: 'muslim' }, async () => ({ text: 'passed through' }))
  const result = await $.command.run(muslim('arabic-fix on'))
  expect(result.text).toBe('passed through')
  expect(writes).toEqual([])
})

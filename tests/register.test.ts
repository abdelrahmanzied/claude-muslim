import { expect, mock, test } from 'claude-code/testing'

const muslim = (args: string) => ({
  command: 'muslim',
  args,
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 80 },
})

test('/muslim shows each setting with its state and how to change it', { options: { tashkeel: false } }, async ($, on) => {
  mock.store(on)
  on('session.surface', async () => ({ value: 'desktop' }))
  const ran = await $.command.run(muslim(''))
  expect(ran.text).toContain('| Tashkeel | off — desktop only; the terminal never shows diacritics | `/muslim tashkeel on` · `off` |')
  expect(ran.text).toContain('| Thikr | on | `/thikr on` · `off` · all options: `/thikr help` |')
  expect(ran.text).toContain('| Terminal Arabic | terminal only | `/muslim terminal-arabic` |')
  expect(ran.text).toContain('| Quran | Muhammad Siddiq Al-Minshawi — murattal | `/quran reciter` |')
  expect(ran.text).toContain('Help: /muslim help')
  expect(ran.text).toContain('| Salah | not set up | `/salah show always` · `<minutes>` · `off` · all options: `/salah help` |')
})

test('/muslim help shows every feature\'s table; with a feature, only its own', async $ => {
  const all = (await $.command.run(muslim('help'))).text
  const salah = (await $.command.run(muslim('help salah'))).text
  const thikr = (await $.command.run(muslim('help thikr'))).text

  expect(all).toContain('/thikr speed auto')
  expect(all).toContain('/salah city')
  expect(all).toContain('/muslim terminal-arabic')
  expect(all).toContain('/muslim tashkeel on | off')
  expect((await $.command.run(muslim('help terminal-arabic'))).text).toBe('/muslim terminal-arabic — choose how Arabic shows in this terminal (applies to all features)')
  expect(salah?.split('\n')[0]).toBe('**Muslim › Salah › Help**')
  expect(salah).toContain('/salah city')
  expect(salah).not.toContain('/thikr')
  expect(thikr).toContain('/thikr mode')
  expect(thikr).not.toContain('/salah')
  expect((await $.command.run(muslim('help quran'))).text).toContain('/quran play <surah>')
  expect(all).toContain('/quran reciter')
  expect((await $.command.run(muslim('help unknown'))).text).toContain('Features: thikr, salah, quran, terminal-arabic, tashkeel')
})

test('session start clears a status line left by an earlier version', async ($, on) => {
  const seen: Array<string | undefined> = []
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  on('ui.status', async (_$, e) => (seen.push(e.text), { value: undefined }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  expect(seen).toEqual([undefined])
})

test('/muslim tashkeel reads and changes the plugin-wide setting', async ($, on) => {
  const writes: unknown[] = []
  on('config.set', async (_$, e) => (writes.push(e), { value: e.value }))
  expect((await $.command.run(muslim('tashkeel'))).text).toContain('Tashkeel on')
  expect((await $.command.run(muslim('tashkeel off'))).text).toContain('Tashkeel off on desktop')
  expect((await $.command.run(muslim('tashkeel'))).text).toContain('the terminal never shows diacritics')
  expect(writes).toEqual([expect.objectContaining({ key: 'muslim.tashkeel', value: false })])
})

test('the old arabic-fix subcommand no longer handles or changes settings', async ($, on) => {
  const writes: unknown[] = []
  on('config.set', async (_$, e) => (writes.push(e), { value: e.value }))
  on('command.run', { command: 'muslim' }, async () => ({ text: 'passed through' }))
  const result = await $.command.run(muslim('arabic-fix on'))
  expect(result.text).toBe('passed through')
  expect(writes).toEqual([])
})

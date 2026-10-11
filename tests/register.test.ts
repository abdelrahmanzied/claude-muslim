import { expect, test } from 'claude-code/testing'

const muslim = (args: string) => ({
  command: 'muslim',
  args,
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 80 },
})

test('/muslim shows each setting with its state and how to change it', { options: { tashkeel: false } }, async $ => {
  const ran = await $.command.run(muslim(''))
  expect(ran.text?.split('\n')[1]).toContain('To change a setting or see every option: `/muslim help`')
  expect(ran.text).toContain('### Features\n\n| Feature | Description | State |')
  expect(ran.text).toContain('| Thikr | Tasbih in Claude\'s working line | on |')
  expect(ran.text).toContain('| Athkar | Morning and evening athkar above the prompt | on |')
  expect(ran.text).toContain('| Salah | Pray times and the next pray under the prompt | not set up |')
  expect(ran.text).toContain('### Shared\n\n| Setting | Description | State |')
  expect(ran.text).toContain('| Tashkeel | Arabic diacritics on desktop; the terminal never shows them | off |')
  expect(ran.text).toContain('| Terminal Arabic | How Arabic shows in this terminal | terminal only |')
})

test('/muslim help shows every feature\'s table; with a feature, only its own', async $ => {
  const all = (await $.command.run(muslim('help'))).text
  const salah = (await $.command.run(muslim('help salah'))).text
  const thikr = (await $.command.run(muslim('help thikr'))).text

  expect(all?.split('\n')[0]).toBe('**Muslim › Help**')
  expect(all).toContain('| `/thikr speed` | How long each phrase stays |')
  expect(all).toContain('/salah city')
  expect(all).toContain('| `/muslim terminal-arabic` |')
  expect(all).toContain('| `/muslim tashkeel` | Arabic diacritics on desktop; the terminal never shows them | `on` (default) · `off` |')
  expect((await $.command.run(muslim('help terminal-arabic'))).text).toContain('| `/muslim terminal-arabic` | Choose how Arabic shows in this terminal, for every feature | — |')
  expect(salah?.split('\n')[0]).toBe('**Muslim › Salah › Help**')
  expect(salah).toContain('/salah city')
  expect(salah).not.toContain('/thikr')
  expect(thikr).toContain('/thikr mode')
  expect(thikr).not.toContain('/salah')
  expect(all).toContain('| `/athkar morning` · `evening` | Read that period again from the start | `reset` |')
  expect((await $.command.run(muslim('help athkar'))).text?.split('\n')[0]).toBe('**Muslim › Athkar › Help**')
  expect((await $.command.run(muslim('help quran'))).text).toContain('Features: thikr, athkar, salah, color, tashkeel, terminal-arabic')
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

for (const color of ['orange', 'green', 'gold', 'blue']) {
  test(`/muslim color reads and writes ${color}`, { options: { color } }, async ($, on) => {
    const writes: unknown[] = []
    on('config.set', async (_$, e) => (writes.push(e), { value: e.value }))
    expect((await $.command.run(muslim('color'))).text).toContain(`Color ${color}.`)
    expect((await $.command.run(muslim(`color ${color}`))).text).toBe(`Color ${color}`)
    expect(writes).toEqual([expect.objectContaining({ key: 'muslim.color', value: color })])
    expect((await $.command.run(muslim(''))).text).toContain(`| Color | The main color in every feature | ${color} |`)
    expect((await $.command.run(muslim('help color'))).text).toContain('| `/muslim color` | The main color in every feature |')
  })
}
test('/muslim color refuses unknown names and extra arguments', async ($, on) => {
  const writes: unknown[] = []
  on('config.set', async (_$, e) => (writes.push(e), { value: e.value }))
  for (const args of ['color red', 'color green extra', 'color Orange']) {
    expect((await $.command.run(muslim(args))).text).toBe('Usage: /muslim color orange | green | gold | blue')
  }
  expect(writes).toEqual([])
})
test('/muslim color reports a denied write', async ($, on) => {
  on('config.set', async () => ({ deny: 'locked' }))
  expect((await $.command.run(muslim('color blue'))).text).toBe('Not changed: locked')
})
test('/athkar color redirects without writing', async ($, on) => {
  const writes: unknown[] = []
  on('config.set', async (_$, e) => (writes.push(e), { value: e.value }))
  for (const args of ['color', 'color green', 'color unknown']) {
    expect((await $.command.run({ ...muslim(args), command: 'athkar' })).text).toBe('Color is now /muslim color.')
  }
  expect(writes).toEqual([])
  expect((await $.command.run(muslim('help athkar'))).text).not.toContain('/athkar color')
})

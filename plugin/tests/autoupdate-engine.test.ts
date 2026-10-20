import { expect, mock, test } from 'claude-code/testing'
import { muslimHelp } from '../src/help.ts'
import { AUTOUPDATE_USAGE, noEntry } from '../src/autoupdate.ts'
const run = (args: string) => ({ command: 'muslim', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })
test('autoupdate has its own help row with both options', () => {
  const help = muslimHelp('autoupdate')
  expect(help).toContain('`/muslim autoupdate`')
  expect(help).toContain('`on` · `off`')
})
for (const value of [true, false]) test(`autoupdate ${value ? 'on' : 'off'} writes only its marketplace key`, async ($, on) => {
  mock.env(on, { HOME: '/fixture' })
  const original = { theme: 'dark', extraKnownMarketplaces: { 'claude-muslim': { source: { source: 'github', repo: 'owner/repo' }, autoUpdate: !value }, other: { autoUpdate: false } } }
  let written = ''
  on('fs.read', async () => ({ value: JSON.stringify(original) }))
  on('fs.write', async (_$, e) => { expect(e.path).toBe('/fixture/.claude/settings.json'); written = e.text; return { value: undefined } })
  expect((await $.command.run(run(`autoupdate ${value ? 'on' : 'off'}`))).text).toContain(`Auto-update ${value ? 'on' : 'off'}`)
  expect(JSON.parse(written)).toEqual({ ...original, extraKnownMarketplaces: { ...original.extraKnownMarketplaces, 'claude-muslim': { ...original.extraKnownMarketplaces['claude-muslim'], autoUpdate: value } } })
})
test('autoupdate status, usage, missing marketplace and malformed settings are quiet and do not write', async ($, on) => {
  mock.env(on, { HOME: '/fixture' })
  let source = '{}', writes = 0
  on('settings.read', async () => ({ value: { extraKnownMarketplaces: { 'claude-muslim': { autoUpdate: false } } } }))
  on('fs.read', async () => ({ value: source }))
  on('fs.write', async () => { writes++; return { value: undefined } })
  expect((await $.command.run(run('autoupdate'))).text).toContain('Auto-update off')
  expect((await $.command.run(run('autoupdate yes'))).text).toBe(AUTOUPDATE_USAGE)
  expect((await $.command.run(run('autoupdate on'))).text).toBe(noEntry)
  source = 'broken'
  expect((await $.command.run(run('autoupdate on'))).text).toContain('not valid JSON')
  expect(writes).toBe(0)
})
for (const choice of [undefined, false, true]) test(`session start seeds auto-update only when no choice exists: ${choice}`, async ($, on) => {
  const clock = mock.clock(on, { now: 1000 })
  mock.env(on, { HOME: '/fixture' })
  const stored: Record<string, unknown> = {}
  on('store.get', async (_$, e) => ({ value: stored[e.key] }))
  let data = { theme: 'dark', extraKnownMarketplaces: { 'claude-muslim': { ...(choice === undefined ? {} : { autoUpdate: choice }) }, other: { autoUpdate: false } } }
  const writes: string[] = [], seeded: unknown[] = []
  on('store.set', async (_$, e) => { stored[e.key] = e.value; if (e.key === 'autoUpdateSeeded') seeded.push(e.value); return { value: undefined } })
  on('fs.read', async () => ({ value: JSON.stringify(data) }))
  on('fs.write', async (_$, e) => { writes.push(e.path); data = JSON.parse(e.text); return { value: undefined } })
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true }); await clock.settle()
  expect(writes).toEqual(choice === undefined ? ['/fixture/.claude/settings.json'] : [])
  expect(data.extraKnownMarketplaces['claude-muslim']).toEqual({ autoUpdate: choice ?? true })
  expect(data.extraKnownMarketplaces.other.autoUpdate).toBe(false)
  expect(seeded).toEqual([true])
  // The seeded flag protects a later explicit off across another start.
  data.extraKnownMarketplaces['claude-muslim'] = { autoUpdate: false }
  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: true })
  expect(data.extraKnownMarketplaces['claude-muslim']).toEqual({ autoUpdate: false })
  expect(seeded).toEqual([true])
})
for (const pending of [true, false]) test(`shared Muslim demo setup hint: pending=${pending}`, async ($, on) => {
  mock.clock(on, { now: 1000 }); mock.env(on, {})
  mock.store(on, pending ? {} : { salahSetupLater: true })
  on('session.surface', async () => ({ value: 'desktop' }))
  const reply = await $.command.run(run('demo'))
  expect(reply.text?.includes('once the setup above is answered')).toBe(pending)
})

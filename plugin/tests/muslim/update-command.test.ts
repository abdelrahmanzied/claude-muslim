import { expect, mock, test } from 'claude-code/testing'

import { VERSION } from '../../src/constants.ts'

const muslim = (args: string) => ({
  command: 'muslim',
  args,
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 80 },
})
const result = (stdout: string, exitCode = 0, stderr = '') => ({ value: { exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false } })
const line = (value: object) => JSON.stringify({ command: 'update', ...value })

test('/muslim update runs only our plugin update and says what happened', async ($, on) => {
  const seen: Array<{ argv: readonly string[]; timeoutMs?: number }> = []
  const toasts: string[] = []
  on('ui.toast', async (_$, e) => (toasts.push(e.text), { value: undefined }))
  on('process.run', async (_$, e) => (seen.push({ argv: e.argv, timeoutMs: e.init?.timeoutMs }), result(line({ outcome: 'ok', message: 'm', updateOutcome: 'up_to_date', oldVersion: VERSION, newVersion: VERSION }))))
  const ran = await $.command.run(muslim('update'))

  expect(seen).toEqual([{ argv: ['claude', 'plugin', 'update', 'muslim@claude-muslim', '--json'], timeoutMs: 120000 }])
  expect(ran.text).toBe(`muslim v${VERSION} is the latest.`)
  expect(toasts.some(text => text.includes('Updating muslim'))).toBe(true)
})

test('a new version replies with the arrow and reloads plugins from a timer', async ($, on) => {
  const clock = mock.clock(on)
  on('ui.toast', async () => ({ value: undefined }))
  const commands: string[] = []
  on('process.run', async () => result(line({ outcome: 'ok', message: 'm', oldVersion: VERSION, newVersion: '9.9.9' })))
  on('command.run', async (_$, e) => (commands.push(e.command), { text: 'reloaded' }))
  const ran = await $.command.run(muslim('update'))

  expect(ran.text).toContain(`muslim v${VERSION} → v9.9.9. Reloading plugins.`)
  expect(commands).toEqual([])
  await clock.advance(1000)
  expect(commands).toEqual(['reload-plugins'])
})

test('a refused reload falls back to a toast', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  on('ui.toast', async (_$, e) => (toasts.push(e.text), { value: undefined }))
  on('process.run', async () => result(line({ outcome: 'ok', message: 'm', oldVersion: VERSION, newVersion: '9.9.9' })))
  on('command.run', async (_$, e) => {
    if (e.command === 'reload-plugins') throw new Error('refused')
    return { text: '' }
  })
  await $.command.run(muslim('update'))
  await clock.advance(1000)

  expect(toasts.at(-1)).toContain('/reload-plugins')
})

test('a failed update or a missing claude gives the shell fallback and no reload', async ($, on) => {
  const commands: string[] = []
  let missingClaude = false
  on('ui.toast', async () => ({ value: undefined }))
  on('command.run', async (_$, e) => (commands.push(e.command), { text: '' }))
  on('process.run', async () => (missingClaude ? { deny: 'spawn claude ENOENT' } : result(line({ outcome: 'failed', message: 'Plugin "muslim" not found', failureCode: 'not_found' }), 1, '✘')))
  const failed = await $.command.run(muslim('update'))
  expect(failed.text).toContain('Not updated: Plugin "muslim" not found')
  expect(failed.text).toContain('`claude plugin update muslim@claude-muslim`')

  missingClaude = true
  const missing = await $.command.run(muslim('update'))
  expect(missing.text).toContain('Not updated: could not run claude')
  expect(commands.filter(c => c === 'reload-plugins')).toEqual([])
})

test('/muslim update takes no arguments and is listed in help', async $ => {
  expect((await $.command.run(muslim('update now'))).text).toBe('Usage: /muslim update')
  expect((await $.command.run(muslim('help'))).text).toContain('| `/muslim update` |')
  expect((await $.command.run(muslim('help update'))).text).toContain('| `/muslim update` |')
})

import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { countedSurface, INSTALL_KEY, INSTALL_URL, installBody, isDone, newRecord, optedOut, osFrom, readRecord } from '../../src/install-count.ts'
import { VERSION } from '../../src/constants.ts'

test('the operating system comes from OS and HOME', () => {
  expect(osFrom({ OS: 'Windows_NT', HOME: 'C:\\Users\\a' })).toBe('windows')
  expect(osFrom({ HOME: '/Users/a' })).toBe('mac')
  expect(osFrom({ HOME: '/home/a' })).toBe('linux')
  expect(osFrom({})).toBe('linux')
})

test('only the terminal and desktop are counted', () => {
  expect(countedSurface('terminal')).toBe('terminal')
  expect(countedSurface('desktop')).toBe('desktop')
  expect(countedSurface('vscode')).toBeUndefined()
  expect(countedSurface(null)).toBeUndefined()
})

test('DO_NOT_TRACK and CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC opt out', () => {
  expect(optedOut({})).toBe(false)
  expect(optedOut({ DO_NOT_TRACK: '0' })).toBe(false)
  expect(optedOut({ DO_NOT_TRACK: '1' })).toBe(true)
  expect(optedOut({ CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 'true' })).toBe(true)
})

test('the body carries only version, surface and os', () => {
  const record = newRecord(Date.UTC(2026, 9, 23, 12), '0.1.0', 'desktop', 'mac')
  expect(record).toEqual({ at: '2026-10-23', version: '0.1.0', surface: 'desktop', os: 'mac', sent: false })
  expect(JSON.parse(installBody(record))).toEqual({ version: '0.1.0', surface: 'desktop', os: 'mac' })
  expect(readRecord(record)).toEqual(record)
  expect(readRecord({ ...record, os: 'beos' })).toBeUndefined()
  expect(readRecord('yes')).toBeUndefined()
})

test('a 2xx or 4xx ends it; a 5xx tries again', () => {
  expect(isDone(204)).toBe(true)
  expect(isDone(400)).toBe(true)
  expect(isDone(503)).toBe(false)
})

const start = (surface: 'terminal' | 'desktop' | null) => ({ cwd: '/tmp', surface, isInteractive: surface !== null })

const setup = (on: On, env: Record<string, string>, status: () => number) => {
  const clock = mock.clock(on, { now: Date.UTC(2026, 9, 23) })
  mock.env(on, env)
  const stored: Record<string, unknown> = {}
  on('store.get', async (_$, e) => ({ value: stored[e.key] }))
  on('store.set', async (_$, e) => { stored[e.key] = e.value; return { value: undefined } })
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  const sent: Array<{ url: string; body?: string }> = []
  on('http.fetch', async (_$, e) => {
    sent.push({ url: e.url, body: e.init?.body })
    return { value: { ok: status() < 300, status: status(), headers: {}, text: '' } }
  })
  return { clock, stored, sent }
}

test('the first start sends once; later starts send nothing', async ($, on) => {
  const { clock, stored, sent } = setup(on, { HOME: '/Users/a' }, () => 204)
  await $.session.start(start('desktop')); await clock.settle()
  expect(sent).toEqual([{ url: INSTALL_URL, body: JSON.stringify({ version: VERSION, surface: 'desktop', os: 'mac' }) }])
  expect(stored[INSTALL_KEY]).toEqual({ at: '2026-10-23', version: VERSION, surface: 'desktop', os: 'mac', sent: true })
  await $.session.start(start('terminal')); await clock.settle()
  expect(sent.length).toBe(1)
})

test('a failed send keeps the first record and tries again next start', async ($, on) => {
  let status = 503
  const { clock, stored, sent } = setup(on, { HOME: '/home/a' }, () => status)
  await $.session.start(start('terminal')); await clock.settle()
  expect(stored[INSTALL_KEY]).toEqual(expect.objectContaining({ surface: 'terminal', os: 'linux', sent: false }))
  status = 204
  await $.session.start(start('desktop')); await clock.settle()
  expect(sent.map(s => JSON.parse(s.body ?? '{}').surface)).toEqual(['terminal', 'terminal'])
  expect(stored[INSTALL_KEY]).toEqual(expect.objectContaining({ surface: 'terminal', sent: true }))
})

test('opted out or with no surface, nothing is sent', async ($, on) => {
  const { clock, sent } = setup(on, { HOME: '/home/a', DO_NOT_TRACK: '1' }, () => 204)
  await $.session.start(start('terminal')); await clock.settle()
  await $.session.start(start(null)); await clock.settle()
  expect(sent).toEqual([])
})

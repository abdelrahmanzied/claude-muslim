import { expect, test } from 'claude-code/testing'

import { CHANGELOG_URL, failedToRun, parseUpdate, updateReply, UPDATE_ARGV } from '../../src/update.ts'

const json = (value: object) => JSON.stringify({ command: 'update', ...value })
const ok = { outcome: 'ok', pluginId: 'muslim@claude-muslim', scope: 'user' }

test('only our plugin is updated, never a bare update', () => {
  expect(UPDATE_ARGV).toEqual(['claude', 'plugin', 'update', 'muslim@claude-muslim', '--json'])
})

test('ok with a new version: arrow, changelog link, reload', () => {
  const result = parseUpdate(json({ ...ok, message: 'Updated', updateOutcome: 'updated', oldVersion: '0.1.0', newVersion: '0.2.0' }))
  expect(result).toEqual({ kind: 'updated', from: '0.1.0', to: '0.2.0' })
  expect(updateReply(result, '0.1.0')).toEqual({ text: `muslim v0.1.0 → v0.2.0. Reloading plugins.\n\nWhat changed: ${CHANGELOG_URL}`, reload: true })
})

test('ok with the new version only in the message', () => {
  const result = parseUpdate(json({ ...ok, message: 'muslim updated from 0.1.0 to 0.2.1. Restart to apply.' }))
  expect(result).toEqual({ kind: 'updated', from: undefined, to: '0.2.1' })
  expect(updateReply(result, '0.1.0').text).toContain('muslim v0.1.0 → v0.2.1.')
})

test('ok but no version anywhere: never invents one', () => {
  const reply = updateReply(parseUpdate(json({ ...ok, message: 'Done.' })), '0.1.0')
  expect(reply.text).toBe(`muslim updated (was v0.1.0). Reloading plugins.\n\nWhat changed: ${CHANGELOG_URL}`)
  expect(reply.reload).toBe(true)
})

test('already the latest, from fields or from the message', () => {
  const fields = parseUpdate(json({ ...ok, message: 'muslim is already at the latest version (0.1.0).', updateOutcome: 'up_to_date', oldVersion: '0.1.0', newVersion: '0.1.0' }))
  expect(updateReply(fields, '0.1.0')).toEqual({ text: 'muslim v0.1.0 is the latest.', reload: false })
  const message = parseUpdate(json({ ...ok, message: 'muslim is already at the latest version (0.1.0).' }))
  expect(message).toEqual({ kind: 'latest', version: '0.1.0' })
  expect(updateReply(message, '0.1.0').text).toBe('muslim v0.1.0 is the latest.')
})

test('latest on disk but older code running: reload', () => {
  const reply = updateReply({ kind: 'latest', version: '0.2.0' }, '0.1.0')
  expect(reply).toEqual({ text: 'muslim v0.2.0 is installed (running v0.1.0). Reloading plugins.', reload: true })
})

test('failed with a message: reason plus the shell fallback', () => {
  const result = parseUpdate(json({ outcome: 'failed', message: 'Plugin "muslim" not found', failureCode: 'not_found' }), '✘ Failed', 1)
  expect(result).toEqual({ kind: 'failed', reason: 'Plugin "muslim" not found' })
  const reply = updateReply(result, '0.1.0')
  expect(reply.text).toBe('Not updated: Plugin "muslim" not found\n\nRun `claude plugin update muslim@claude-muslim` in a shell, then `/reload-plugins`.')
  expect(reply.reload).toBe(false)
})

test('failed with only a failureCode', () => {
  expect(parseUpdate(json({ outcome: 'failed', failureCode: 'network' }), '', 1)).toEqual({ kind: 'failed', reason: 'network' })
  expect(parseUpdate(json({ outcome: 'failed' }), '', 1)).toEqual({ kind: 'failed', reason: 'unknown error' })
})

test('empty or garbage output fails with the best reason available', () => {
  expect(parseUpdate('')).toEqual({ kind: 'failed', reason: 'claude printed no result' })
  expect(parseUpdate('\n  \n', '', 2)).toEqual({ kind: 'failed', reason: 'claude exited with code 2' })
  expect(parseUpdate('not json at all', 'boom\nmore', 1)).toEqual({ kind: 'failed', reason: 'boom' })
  expect(parseUpdate('[1,2]')).toEqual({ kind: 'failed', reason: 'claude printed no result' })
})

test('the last non-empty line is the one read; a non-JSON last line is not', () => {
  const line = json({ ...ok, message: 'x', updateOutcome: 'up_to_date', newVersion: '0.1.0' })
  expect(parseUpdate(`Checking...\n${line}\n\n`).kind).toBe('latest')
  expect(parseUpdate(`${line}\nDone.`).kind).toBe('failed')
  expect(parseUpdate(`${json({ ...ok, newVersion: '0.9.0' })}\r\n${line}\r\n`)).toEqual({ kind: 'latest', version: '0.1.0' })
})

test('spawn error or timeout', () => {
  expect(failedToRun(new Error('spawn claude ENOENT'))).toEqual({ kind: 'failed', reason: 'could not run claude (spawn claude ENOENT)' })
  expect(failedToRun(new Error('timed out after 120000 ms\nstack'))).toEqual({ kind: 'failed', reason: 'could not run claude (timed out after 120000 ms)' })
  expect(failedToRun('')).toEqual({ kind: 'failed', reason: 'could not run claude' })
  expect(updateReply(failedToRun(new Error('x')), '0.1.0').text).toContain('Not updated: could not run claude (x)')
})

import { expect, test } from 'claude-code/testing'
import { connectBeforeReload, stopBeforeReload } from '../../../src/shared/reload/signal.ts'

test('an unconnected Quran resolves immediately', async () => {
  await stopBeforeReload()
})

test('reload stops serialize, and a failed stop leaves the next attempt available', async () => {
  let calls = 0
  connectBeforeReload(async () => { if (++calls === 1) throw new Error('failed stop') })
  await expect(stopBeforeReload()).rejects.toThrow('failed stop')
  await stopBeforeReload()
  expect(calls).toBe(2)
})

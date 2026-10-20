import { expect, mock, test } from 'claude-code/testing'
import { emptyDay } from '../../src/features/athkar/logic.ts'

test('/athkar morning reports a denied store write', async ($, on) => {
  mock.clock(on, { now: new Date(2026, 9, 10, 10).getTime() })
  mock.env(on, {})
  const day = emptyDay('2026-10-10')
  day.morning.isHidden = true
  const saved: Record<string, unknown> = { athkar: day, arabicTerminals: { unknown: 'plain' }, salahSetupLater: true }
  on('store.get', (_$, e) => ({ value: saved[e.key] }))
  on('session.surface', async () => ({ value: 'terminal' }))
  // The harness skips a throwing stub unless its catch answers the noun's refusal.
  on('store.set', { key: 'athkar' }, () => { throw new Error('EPERM: operation not permitted') })
    .catch(($, e, next) => ({ deny: next.error.message ?? '' }))

  const reply = await $.command.run({ command: 'athkar', args: 'morning', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(reply.text).toContain('Could not complete /athkar morning:')
  expect(reply.text).toContain('EPERM: operation not permitted')
})

import { expect, test } from 'claude-code/testing'

import { DEMO_STEPS, DEMO_GAP_MS, DEMO_START_MS, demoReply } from '../../src/demo.ts'

test('the shared demo signals the existing demos in order, with no athkar style argument', () => {
  expect(DEMO_STEPS).toEqual(['thikr', 'athkar', 'salah'])
})

test('signals start shortly after the reply; each following demo starts a short gap after the last one ends', () => {
  expect(DEMO_START_MS).toBe(100)
  expect(DEMO_GAP_MS).toBe(100)
})

test('the reply names every demo and explains the transcript and token cost', () => {
  expect(demoReply()).toBe('**Muslim demo:** playing. Thikr (a real turn, about 30 s), then athkar, then /salah demo (the athan moment). The thikr part uses tokens and leaves a message in the transcript.')
})

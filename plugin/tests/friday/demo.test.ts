import { expect, test } from 'claude-code/testing'

import { DEMO_MS, demoReply, demoShowing } from '../../src/features/friday/demo.ts'

test('the demo shows the card for six seconds and says nothing is saved', () => {
  expect(DEMO_MS).toBe(6000)
  expect(demoReply()).toBe('**Friday demo:** the Al-Kahf card for 6 s. Nothing is saved.')
})

test('it is showing until the six seconds are over', () => {
  expect(demoShowing(1000, 1000)).toBe(true)
  expect(demoShowing(1000, 6999)).toBe(true)
  expect(demoShowing(1000, 7000)).toBe(false)
})

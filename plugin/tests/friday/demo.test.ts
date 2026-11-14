import { expect, test } from 'claude-code/testing'

import { DEMO_MS, DEMO_STEPS, demoNext, demoReply, demoShowing } from '../../src/features/friday/demo.ts'

test('the demo is the athan card named الجمعة, then the Al-Kahf card, and says nothing is saved', () => {
  expect(DEMO_STEPS).toEqual(['athan', 'alkahf'])
  expect(demoReply()).toContain('the athan card with الجمعة, then the Al-Kahf card')
  expect(demoReply()).toContain('Each shows, then goes.')
  expect(demoReply()).toContain('Nothing is saved.')
  // The fake rows are gone: no pray line, salawat or pane button.
  expect(demoReply()).not.toMatch(/salawat|pray line|button/)
})

test('each step is followed by the next, and the last by nothing', () => {
  expect(demoNext('athan')).toBe('alkahf')
  expect(demoNext('alkahf')).toBeNull()
})

test('the Al-Kahf card shows for five seconds', () => {
  expect(DEMO_MS).toBe(5000)
  expect(demoShowing(1000, 1000)).toBe(true)
  expect(demoShowing(1000, 5999)).toBe(true)
  expect(demoShowing(1000, 6000)).toBe(false)
})

import { expect, test } from 'claude-code/testing'

import { DEMO_MS, demoPrayLine, demoReply, demoSalawat, demoShowing } from '../../src/features/friday/demo.ts'
import { SALAWAT } from '../../src/shared/thikr/salawat.ts'

test('the demo shows everything for eight seconds and says nothing is saved', () => {
  expect(DEMO_MS).toBe(8000)
  expect(demoReply()).toContain('for 8 s')
  expect(demoReply()).toContain('the Al-Kahf card')
  expect(demoReply()).toContain('الجمعة in place of الظهر')
  expect(demoReply()).toContain('one Friday salawat on the thikr line')
  expect(demoReply()).toContain('«سورة الكهف» button')
  expect(demoReply()).toContain('Nothing is saved.')
})

test('it is showing until the eight seconds are over', () => {
  expect(demoShowing(1000, 1000)).toBe(true)
  expect(demoShowing(1000, 8999)).toBe(true)
  expect(demoShowing(1000, 9000)).toBe(false)
})

test('the pray line names the Dhuhr slot الجمعة whatever today is', () => {
  expect(demoPrayLine()).toBe('☾ الجمعة ١٢:٣٠')
  expect(demoPrayLine()).not.toContain('الظهر')
})

test('the thikr line shows the first authored salawat', () => {
  expect(demoSalawat()).toBe(SALAWAT[0])
  expect(demoSalawat()).toContain('مُحَمَّدٍ')
})

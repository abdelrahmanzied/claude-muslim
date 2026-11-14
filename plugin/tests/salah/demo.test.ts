import { expect, test } from 'claude-code/testing'

import { demoFridayMoment, demoMoment, demoState } from '../../src/features/salah/demo.ts'
import { athanText } from '../../src/shared/pray/line.ts'

test('the Friday demo athan is Dhuhr at 12:30 on a Friday, named الجمعة', () => {
  const m = demoFridayMoment()
  expect(m.pray).toBe('dhuhr')
  expect(m.time).toBe('12:30')
  expect(athanText(m.pray, m.at)).toBe('حان وقت صلاة الجمعة')
})

test('the plain demo is still fixed Fajr 05:00, and both draw the same moment lengths', () => {
  expect(demoMoment().time).toBe('05:00')
  const fajr = demoState(1000)
  const friday = demoState(1000, demoFridayMoment())
  expect(fajr.card.pray).toBe('fajr')
  expect(friday.card.pray).toBe('dhuhr')
  expect(friday.card.until).toBe(fajr.card.until)
  expect(friday.minaret.until).toBe(fajr.minaret.until)
})

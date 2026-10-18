import { expect, test } from 'claude-code/testing'
import { mayOpenByItself, readRemindFrom, setupPending } from '../../../src/shared/pray/first-run.ts'

test('setup is pending only when its card is enabled and no answer exists', () => {
  expect(setupPending(false, false, null)).toBe(true)
  expect(setupPending(false, false, null, false)).toBe(false)
  expect(setupPending(true, false, null)).toBe(false)
  expect(setupPending(false, true, null)).toBe(false)
  expect(setupPending(false, false, 0)).toBe(false)
})

test('automatic events include equality, exclude older starts, and stay quiet while pending', () => {
  for (const pending of [true, false]) {
    for (const at of [999, 1000, 1001]) expect(mayOpenByItself(pending, 1000, at)).toBe(!pending && at >= 1000)
  }
  expect(mayOpenByItself(false, 1000, null)).toBe(false)
  expect(mayOpenByItself(true, null, 2000)).toBe(false)
})

test('existing city and Not now choices with no timestamp retain automatic behavior', () => {
  for (const [place, later] of [[true, false], [false, true]]) {
    for (const at of [null, 0, 999]) expect(mayOpenByItself(setupPending(place!, later!, null), null, at)).toBe(true)
  }
})

test('only a finite stored number is an answer timestamp, including epoch zero', () => {
  for (const raw of [undefined, null, false, '1000', {}, NaN, Infinity]) expect(readRemindFrom(raw)).toBe(null)
  expect(readRemindFrom(0)).toBe(0)
  expect(readRemindFrom(1000)).toBe(1000)
})

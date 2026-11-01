import { expect, test } from 'claude-code/testing'

import { dayKey, isSalawatTime, KAHF_SURAH } from '../../../src/shared/friday/index.ts'

const at = (day: number, hour: number, minute = 0): number => new Date(2026, 10, day, hour, minute).getTime()

test('the day key is the device\'s local date, zero padded', () => {
  expect(dayKey(at(6, 23, 59))).toBe('2026-11-06')
  expect(dayKey(new Date(2026, 0, 2, 0, 1).getTime())).toBe('2026-01-02')
})

test('Al-Kahf is surah 18', () => {
  expect(KAHF_SURAH).toBe(18)
})

test('salawat runs on Friday from Fajr, and the whole device day with no saved place', () => {
  const fajr = at(6, 5)
  expect(isSalawatTime(true, at(6, 4, 59), fajr)).toBe(false)
  expect(isSalawatTime(true, at(6, 5), fajr)).toBe(true)
  expect(isSalawatTime(true, at(6, 22), fajr)).toBe(true)
  expect(isSalawatTime(true, at(6, 1), null)).toBe(true)
})

test('salawat is off on other days and when the setting is off', () => {
  expect(isSalawatTime(true, at(5, 12), at(5, 5))).toBe(false)
  expect(isSalawatTime(true, at(7, 12), null)).toBe(false)
  expect(isSalawatTime(false, at(6, 12), at(6, 5))).toBe(false)
})

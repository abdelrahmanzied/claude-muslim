import { expect, test } from 'claude-code/testing'
import { dayOf, emptyDay, nextPeriodAt, periodOn, readDay, setAt } from '../../src/features/athkar/logic.ts'
import type { SalahAthkarTimes } from '../../types'

const times: SalahAthkarTimes = {
  day: '2026-10-11', previousDay: '2026-10-10',
  fajr: new Date(2026, 9, 11, 6, 12).getTime(),
  sunrise: new Date(2026, 9, 11, 7, 30).getTime(),
  isha: new Date(2026, 9, 11, 20, 10).getTime(),
  maghrib: new Date(2026, 9, 11, 18, 35).getTime(),
  nextFajr: new Date(2026, 9, 12, 6, 14).getTime(),
}

test('prayer periods and next wake-up include Fajr and exclude Maghrib', () => {
  for (const [at, period, next] of [
    [times.fajr - 1, 'evening', times.fajr], [times.fajr, 'morning', times.maghrib],
    [times.maghrib - 1, 'morning', times.maghrib], [times.maghrib, 'evening', times.nextFajr],
  ] as const) {
    const now = new Date(at)
    expect(periodOn(now, times)).toBe(period)
    expect(nextPeriodAt(now, times)).toBe(next)
    expect(setAt(now, emptyDay(dayOf(now, times)), null, undefined, null, times)).toBe(period)
  }
})

test('after midnight retains evening progress past 05:00, and Fajr starts fresh', () => {
  const saved = emptyDay(times.previousDay)
  saved.evening.counts['75'] = 1
  for (const at of [new Date(2026, 9, 11, 0, 1).getTime(), new Date(2026, 9, 11, 5, 1).getTime(), times.fajr - 1]) {
    expect(periodOn(new Date(at), times)).toBe('evening')
    expect(dayOf(new Date(at), times)).toBe(times.previousDay)
    expect(readDay(saved, dayOf(new Date(at), times)).evening.counts['75']).toBe(1)
  }
  expect(dayOf(new Date(times.fajr), times)).toBe(times.day)
  expect(readDay(saved, dayOf(new Date(times.fajr), times))).toEqual(emptyDay(times.day))
  expect(setAt(new Date(times.fajr), saved, null, 'evening', null, times)).toBe('evening')
  expect(setAt(new Date(times.maghrib), saved, null, 'morning', null, times)).toBe('morning')
})


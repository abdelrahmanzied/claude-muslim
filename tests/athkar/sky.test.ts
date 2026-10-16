import { expect, test } from 'claude-code/testing'
import { skyAt, skyBoundaries, skyOn } from '../../src/features/athkar/logic.ts'
import type { SalahAthkarTimes } from '../../types'

const HOUR = 3600_000
const at = (hour: number) => Date.parse('2026-10-11T00:00:00Z') + hour * HOUR
const times: SalahAthkarTimes = {
  day: '2026-10-11', previousDay: '2026-10-10',
  fajr: at(5.25), sunrise: at(7), maghrib: at(18.5), isha: at(20), nextFajr: at(29.25),
}

test('prayer sky switches at every inclusive boundary, with crescent before Fajr and after midnight', () => {
  const bounds = skyBoundaries(times)
  expect(bounds).toEqual({ fajr: at(5.25), sunrise: at(7), day: at(9), rose: at(17.5), maghrib: at(18.5), crescent: at(19.5) })
  for (const [boundary, before, after] of [
    [bounds.fajr, 'crescent', 'dawn'], [bounds.sunrise, 'dawn', 'sunrise'],
    [bounds.day, 'sunrise', 'day'], [bounds.rose, 'day', 'rose'],
    [bounds.maghrib, 'rose', 'bluehour'], [bounds.crescent, 'bluehour', 'crescent'],
  ] as const) {
    expect(skyOn(new Date(boundary - 1), times)).toBe(before)
    expect(skyOn(new Date(boundary), times)).toBe(after)
  }
  for (const hour of [0, 4.5, 24.5, 29.25 - 1 / HOUR]) {
    expect(skyOn(new Date(at(hour)), times)).toBe('crescent')
  }
  const tomorrow = { ...times, fajr: times.nextFajr, sunrise: at(31), maghrib: at(42.5), isha: at(44), nextFajr: at(53.25) }
  expect(skyOn(new Date(times.nextFajr), tomorrow)).toBe('dawn')
})

test('blue hour ends at earlier Isha, never before Maghrib or past next Fajr', () => {
  const early = { ...times, isha: at(19) }
  expect(skyOn(new Date(at(19) - 1), early)).toBe('bluehour')
  expect(skyOn(new Date(at(19)), early)).toBe('crescent')
  expect(skyBoundaries({ ...times, isha: at(18) }).crescent).toBe(times.maghrib)
  expect(skyBoundaries({ ...times, isha: NaN }).crescent).toBe(at(19.5))
  expect(skyBoundaries({ ...times, nextFajr: at(19) }).crescent).toBe(at(19))
})

test('missing, nonfinite or out-of-range sunrise falls back to Fajr plus 1.5 hours', () => {
  for (const sunrise of [undefined, NaN, Infinity, -Infinity, times.fajr - 1, times.fajr, times.maghrib, times.maghrib + 1]) {
    // An unavailable library result is tolerated at runtime as well as NaN.
    const fallback = { ...times, sunrise } as SalahAthkarTimes
    const boundary = times.fajr + 1.5 * HOUR
    expect(skyBoundaries(fallback).sunrise).toBe(boundary)
    expect(skyOn(new Date(boundary - 1), fallback)).toBe('dawn')
    expect(skyOn(new Date(boundary), fallback)).toBe('sunrise')
  }
})

test('short days clamp phase starts in order, allowing empty day and sunrise phases', () => {
  const short = { ...times, fajr: at(10), sunrise: at(11), maghrib: at(13), isha: at(13.5) }
  expect(skyBoundaries(short)).toEqual({ fajr: at(10), sunrise: at(11), day: at(12), rose: at(12), maghrib: at(13), crescent: at(13.5) })
  expect(skyOn(new Date(at(12) - 1), short)).toBe('sunrise')
  expect(skyOn(new Date(at(12)), short)).toBe('rose')
  for (const maghrib of [at(10.5), at(10), at(9)]) {
    const tiny = { ...short, sunrise: NaN, maghrib }
    const b = skyBoundaries(tiny)
    const ordered = [b.fajr, b.sunrise, b.day, b.rose, b.maghrib, b.crescent]
    expect(ordered).toEqual([...ordered].sort((a, b) => a - b))
    expect(skyOn(new Date(b.maghrib), tiny)).toBe('bluehour')
  }
})

test('without prayer times every minute retains the exact fixed-hour sky', () => {
  for (let minute = 0; minute < 24 * 60; minute++) {
    const hour = minute / 60
    const expected = hour >= 4 && hour < 6 ? 'dawn' : hour >= 6 && hour < 8 ? 'sunrise'
      : hour >= 8 && hour < 17 ? 'day' : hour >= 17 && hour < 18 ? 'rose'
      : hour >= 18 && hour < 19 ? 'bluehour' : 'crescent'
    const date = new Date(2026, 9, 11, 0, minute)
    expect(skyAt(hour)).toBe(expected)
    expect(skyOn(date)).toBe(expected)
    expect(skyOn(date, null)).toBe(expected)
  }
})

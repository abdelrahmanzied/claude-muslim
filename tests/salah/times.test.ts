import { describe, expect, test } from 'claude-code/testing'

import { hijriMonth, localTime } from '../../src/features/salah/clock.ts'
import { PRAYS } from '../../src/features/salah/methods.ts'
import { athkarTimes, clockText, lastPray, NO_ADJUST, nextPray, timesOn } from '../../src/features/salah/times.ts'

const MUNICH = { latitude: 48.1372, longitude: 11.5755, timeZone: 'Europe/Berlin' }
const CAIRO = { latitude: 30.05, longitude: 31.25, timeZone: 'Africa/Cairo' }
const MAKKAH = { latitude: 21.4225, longitude: 39.8262, timeZone: 'Asia/Riyadh' }

// 10:00 UTC on 10 October 2026.
const OCT_10 = Date.parse('2026-10-10T10:00:00Z')
const MINUTE = 60_000

const day = (where: typeof MUNICH, method: Parameters<typeof timesOn>[1], at = OCT_10, adjust = NO_ADJUST) => {
  const times = timesOn(where, method, adjust, at)

  return PRAYS.map(pray => clockText(times[pray], where.timeZone))
}

describe('timesOn', () => {
  test('Munich, Muslim World League, in local time', { options: { athkar: false } }, async () => {
    expect(day(MUNICH, 'mwl')).toEqual(['05:42', '07:26', '13:02', '15:59', '18:35', '20:12'])
  })

  test('Cairo, Egyptian General Authority', { options: { athkar: false } }, async () => {
    expect(day(CAIRO, 'egypt')).toEqual(['05:27', '06:54', '12:43', '16:00', '18:30', '19:47'])
  })

  test('Makkah, Umm al-Qura: Isha 90 minutes after Maghrib, 120 in Ramadan', { options: { athkar: false } }, async () => {
    const before = timesOn(MAKKAH, 'ummAlQura', NO_ADJUST, OCT_10)
    const ramadan = timesOn(MAKKAH, 'ummAlQura', NO_ADJUST, Date.parse('2027-02-20T10:00:00Z'))

    expect((before.isha - before.maghrib) / MINUTE).toBe(90)
    expect((ramadan.isha - ramadan.maghrib) / MINUTE).toBe(120)
  })

  test('the user\'s minutes move each pray on its own', async () => {
    expect(day(MUNICH, 'mwl', OCT_10, { ...NO_ADJUST, asr: 5, isha: -10 }))
      .toEqual(['05:42', '07:26', '13:02', '16:04', '18:35', '20:02'])
  })

  test('the local day decides the date, not UTC', { options: { athkar: false } }, async () => {
    // 23:30 in Cairo on 10 October is 20:30 UTC; just after midnight is 11 October.
    const late = timesOn(CAIRO, 'egypt', NO_ADJUST, Date.parse('2026-10-10T20:30:00Z'))
    const next = timesOn(CAIRO, 'egypt', NO_ADJUST, Date.parse('2026-10-10T21:30:00Z'))

    expect(localTime(late.fajr, 'Africa/Cairo').day).toBe(10)
    expect(localTime(next.fajr, 'Africa/Cairo').day).toBe(11)
  })
})

describe('nextPray and lastPray', () => {
  test('mid-morning: Dhuhr is next, Fajr was last', { options: { athkar: false } }, async () => {
    expect(nextPray(MUNICH, 'mwl', NO_ADJUST, Date.parse('2026-10-10T08:00:00Z')).pray).toBe('dhuhr')
    expect(lastPray(MUNICH, 'mwl', NO_ADJUST, Date.parse('2026-10-10T08:00:00Z')).pray).toBe('fajr')
  })

  test('before dawn: Fajr is next, yesterday\'s Isha was last', async () => {
    const at = Date.parse('2026-10-10T01:00:00Z')

    expect(clockText(nextPray(MUNICH, 'mwl', NO_ADJUST, at).at, MUNICH.timeZone)).toBe('05:42')
    expect(lastPray(MUNICH, 'mwl', NO_ADJUST, at).pray).toBe('isha')
  })

  test('after Isha: tomorrow\'s Fajr is next', async () => {
    const at = Date.parse('2026-10-10T20:00:00Z')
    const next = nextPray(MUNICH, 'mwl', NO_ADJUST, at)

    expect(next.pray).toBe('fajr')
    expect(localTime(next.at, MUNICH.timeZone).day).toBe(11)
  })
})

describe('clock', () => {
  test('reads summer and winter time in the zone', { options: { athkar: false } }, async () => {
    expect(localTime(Date.parse('2026-07-01T12:00:00Z'), 'Europe/Berlin').hour).toBe(14)
    expect(localTime(Date.parse('2026-12-01T12:00:00Z'), 'Europe/Berlin').hour).toBe(13)
  })

  test('Ramadan 1448 is the ninth Hijri month', { options: { athkar: false } }, async () => {
    expect(hijriMonth(Date.parse('2027-02-20T10:00:00Z'), 'Asia/Riyadh')).toBe(9)
    expect(hijriMonth(OCT_10, 'Asia/Riyadh')).not.toBe(9)
  })
})


test('athkar bounds share adjusted prayer times and calendar dates through DST', () => {
  for (const at of [OCT_10, Date.parse('2026-10-25T00:30:00Z'), Date.parse('2026-03-29T00:30:00Z')]) {
    const adjust = { ...NO_ADJUST, fajr: 7, maghrib: -3 }
    const bounds = athkarTimes(MUNICH, 'mwl', adjust, at)
    const today = timesOn(MUNICH, 'mwl', adjust, at)
    expect(bounds.fajr).toBe(today.fajr)
    expect(bounds.maghrib).toBe(today.maghrib)
    expect(bounds.nextFajr).toBe(timesOn(MUNICH, 'mwl', adjust, at + 27 * 3600_000).fajr)
  }
  const bounds = athkarTimes(MUNICH, 'mwl', NO_ADJUST, Date.parse('2026-01-01T00:30:00Z'))
  expect(bounds.day).toBe('2026-01-01')
  expect(bounds.previousDay).toBe('2025-12-31')
})

test('athkar bounds refresh at place midnight before the Fajr day changes', () => {
  const first = athkarTimes(MUNICH, 'mwl', NO_ADJUST, Date.parse('2026-10-10T21:59:59Z'))
  const second = athkarTimes(MUNICH, 'mwl', NO_ADJUST, Date.parse('2026-10-10T22:00:01Z'))
  expect(first.day).toBe('2026-10-10')
  expect(second.day).toBe('2026-10-11')
  expect(second.previousDay).toBe(first.day)
  expect(second.fajr).toBe(first.nextFajr)
})

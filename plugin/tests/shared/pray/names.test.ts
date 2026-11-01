import { expect, test } from 'claude-code/testing'

import { arabicName, englishName, isFriday, JUMUAH } from '../../../src/shared/pray/names.ts'

// 2026-11-06 is a Friday, 2026-11-05 a Thursday, 2026-11-07 a Saturday, all on the device's local day.
const at = (day: number, hour: number, minute = 0): number => new Date(2026, 10, day, hour, minute).getTime()

test('on a local Friday the Dhuhr slot is Jumu\'ah, in English and in Arabic', () => {
  expect(JUMUAH).toEqual({ english: "Jumu'ah", arabic: 'الجمعة' })
  expect(englishName('dhuhr', at(6, 12))).toBe("Jumu'ah")
  expect(arabicName('dhuhr', at(6, 12))).toBe('الجمعة')
})

test('only Dhuhr changes, and only on Friday', () => {
  for (const pray of ['fajr', 'sunrise', 'asr', 'maghrib', 'isha'] as const) {
    expect(englishName(pray, at(6, 12))).toBe({ fajr: 'Fajr', sunrise: 'Sunrise', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' }[pray])
  }
  expect(arabicName('asr', at(6, 15))).toBe('العصر')
  expect(englishName('dhuhr', at(5, 12))).toBe('Dhuhr')
  expect(arabicName('dhuhr', at(7, 12))).toBe('الظهر')
})

test('the device\'s local day decides: the last minute of Thursday and the first of Friday', () => {
  expect(isFriday(at(5, 23, 59))).toBe(false)
  expect(isFriday(at(6, 0, 0))).toBe(true)
  expect(isFriday(at(6, 23, 59))).toBe(true)
  expect(isFriday(at(7, 0, 0))).toBe(false)
})

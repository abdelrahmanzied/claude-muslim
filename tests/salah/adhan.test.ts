import { describe, expect, test } from 'claude-code/testing'

import { CalculationMethod, Coordinates, PrayerTimes } from '../../src/features/salah/adhan/Adhan.ts'

// Minutes from midnight UTC.
const minutes = (date: Date) => date.getUTCHours() * 60 + date.getUTCMinutes()
const clock = (text: string) => Number(text.slice(0, 2)) * 60 + Number(text.slice(3, 5))

// AlAdhan API for 10 October 2026, in UTC (Munich +2, Cairo +3, Makkah +3).
// Its Asr runs up to 3 minutes later than adhan's; both sit within a few minutes
// of the sun's actual position.
const CASES = [
  { place: 'Munich', at: [48.1372, 11.5755], method: CalculationMethod.MuslimWorldLeague(), aladhan: ['03:42', '05:26', '11:01', '14:02', '16:35', '18:12'] },
  { place: 'Cairo', at: [30.05, 31.25], method: CalculationMethod.Egyptian(), aladhan: ['02:27', '03:54', '09:42', '13:02', '15:30', '16:47'] },
  { place: 'Makkah', at: [21.4225, 39.8262], method: CalculationMethod.UmmAlQura(), aladhan: ['01:59', '03:15', '09:08', '12:30', '15:01', '16:31'] },
] as const

describe('adhan', () => {
  for (const { place, at, method, aladhan } of CASES) {
    test(`${place}, 10 October 2026, within 3 minutes of AlAdhan`, async () => {
      const times = new PrayerTimes(new Coordinates(at[0], at[1]), new Date(2026, 9, 10), method)
      const ours = [times.fajr, times.sunrise, times.dhuhr, times.asr, times.maghrib, times.isha].map(minutes)

      ours.forEach((value, i) => expect(Math.abs(value - clock(aladhan[i] ?? ''))).toBeLessThanOrEqual(3))
    })
  }
})

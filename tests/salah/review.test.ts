import { describe, expect, test } from 'claude-code/testing'

import { nudge, reviewRows } from '../../src/features/salah/review.ts'
import { NO_ADJUST } from '../../src/features/salah/times.ts'

const MUNICH = { name: 'Munich, Germany', latitude: 48.1372, longitude: 11.5755, timeZone: 'Europe/Berlin', country: 'DE' }

describe('review', () => {
  test('rows show each pray\'s time with its minutes', async () => {
    const rows = reviewRows(MUNICH, 'mwl', { ...NO_ADJUST, asr: 5, isha: -2 }, Date.parse('2026-10-10T10:00:00Z'))

    expect(rows.map(row => [row.name.trim(), row.time, row.minutes.trim()])).toEqual([
      ['Fajr', '05:42', '0'], ['Sunrise', '07:26', '0'], ['Dhuhr', '13:02', '0'],
      ['Asr', '16:04', '+5'], ['Maghrib', '18:35', '0'], ['Isha', '20:10', '-2'],
    ])
  })

  test('nudge moves one pray beyond an hour in either direction', async () => {
    expect(nudge(NO_ADJUST, 'fajr', 1).fajr).toBe(1)
    expect(nudge({ ...NO_ADJUST, fajr: 60 }, 'fajr', 1).fajr).toBe(61)
    expect(nudge({ ...NO_ADJUST, fajr: -60 }, 'fajr', -1).fajr).toBe(-61)
  })
})

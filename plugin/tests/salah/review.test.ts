import { describe, expect, test } from 'claude-code/testing'

import { reviewHint, reviewRows, typedMinutes, withTyped } from '../../src/features/salah/review.ts'
import { NO_ADJUST } from '../../src/features/salah/times.ts'
import { ATHKAR_QUIET } from '../fixtures/config.ts'

const MUNICH = { name: 'Munich, Germany', latitude: 48.1372, longitude: 11.5755, timeZone: 'Europe/Berlin', country: 'DE' }

describe('review', () => {
  test('rows show each pray\'s time with its minutes', async () => {
    const rows = reviewRows(MUNICH, 'mwl', { ...NO_ADJUST, asr: 5, isha: -2 }, Date.parse('2026-10-10T10:00:00Z'))

    expect(rows.map(row => [row.name.trim(), row.time, row.minutes.trim()])).toEqual([
      ['Fajr', '05:42', '0'], ['Sunrise', '07:26', '0'], ['Dhuhr', '13:02', '0'],
      ['Asr', '16:04', '+5'], ['Maghrib', '18:35', '0'], ['Isha', '20:10', '-2'],
    ])
  })

  test('typed minutes take any whole number, 0 and negatives included, in Latin or Arabic-Indic digits', { options: { ...ATHKAR_QUIET } }, async () => {
    expect([typedMinutes('61'), typedMinutes('-61'), typedMinutes('0'), typedMinutes('+5'), typedMinutes('−٣'), typedMinutes('٣')]).toEqual([61, -61, 0, 5, -3, 3])
    for (const text of ['', 'five', '2.5', '5 min', '--1']) expect(typedMinutes(text)).toBeUndefined()
  })

  test('typed boxes apply over the draft, or name the first that is not whole minutes', { options: { ...ATHKAR_QUIET } }, async () => {
    expect(withTyped({ ...NO_ADJUST, fajr: 2 }, new Map([['asr', '5'], ['isha', '-1']]))).toEqual({ draft: { ...NO_ADJUST, fajr: 2, asr: 5, isha: -1 } })
    expect(withTyped(NO_ADJUST, new Map([['dhuhr', 'x'], ['asr', '?']]))).toEqual({ invalid: 'dhuhr' })
  })
})

test('the form says how to reach a box, what to type and how to save, per surface', () => {
  expect(reviewHint('terminal')).toBe('ctrl+x tab or click a box · 5 later, -5 earlier, 0 none · Enter applies · then Save')
  expect(reviewHint('desktop')).toBe('Click a box · 5 later, -5 earlier, 0 none · Enter applies · then Save')
  expect(reviewHint('mobile')).toBe('Change one with /salah adjust <pray> <±min> · 5 later, -5 earlier, 0 none')
})

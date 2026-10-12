import { expect, test } from 'claude-code/testing'

import { readOptions } from '../../src/config.ts'
import { athanDemo, demoMoment } from '../../src/features/salah/demo.ts'
import { momentState } from '../../src/features/salah/moment.ts'
import { NO_ADJUST } from '../../src/features/salah/times.ts'

const PLACE = { name: 'Munich, Germany', latitude: 48.1372, longitude: 11.5755, timeZone: 'Europe/Berlin', country: 'DE' }
const NOW = Date.parse('2026-10-10T10:00:00Z')

test('the demo selects the next pray and its local time, with no input changes', () => {
  const options = readOptions({})
  const before = JSON.stringify({ options, place: PLACE })

  expect(athanDemo(options, PLACE, NOW)).toEqual({ pray: 'dhuhr', time: '13:02', text: '**Athan demo:** Dhuhr' })
  expect(JSON.stringify({ options, place: PLACE })).toBe(before)
})

test('sunrise shows as Fajr, keeping the supplied local time', () => {
  expect(demoMoment({ pray: 'sunrise', at: NOW }, PLACE.timeZone))
    .toEqual({ pray: 'fajr', time: '12:00', text: '**Athan demo:** Fajr' })
})

test('after Isha the demo selects tomorrow\'s Fajr', () => {
  expect(athanDemo(readOptions({}), PLACE, Date.parse('2026-10-10T21:00:00Z')))
    .toEqual({ pray: 'fajr', time: '05:44', text: '**Athan demo:** Fajr' })
})

test('the demo respects the method and adjusted times even with the display off', () => {
  const options = { ...readOptions({ salahMethod: 'mwl', salahShow: 'off', salahAthan: false }), salahAdjust: { ...NO_ADJUST, dhuhr: 5 } }

  expect(athanDemo(options, PLACE, NOW)).toEqual({ pray: 'dhuhr', time: '13:07', text: '**Athan demo:** Dhuhr' })
})

test('the real moment and demo use the same fold and expiry deadlines', () => {
  const moment = momentState('asr', '15:59', NOW)
  expect(moment.card).toMatchObject({ pray: 'asr', time: '15:59', isFolded: false, foldsAt: NOW + 60_000, until: NOW + 900_000 })
  expect(moment.minaret).toMatchObject({ pray: 'asr', frame: 1, startedAt: NOW, isFolded: false, foldsAt: NOW + 3010, until: moment.card.until })
})

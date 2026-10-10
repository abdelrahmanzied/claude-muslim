import { describe, expect, mock, test } from 'claude-code/testing'

import { readAdjust, readOptions, writeAdjust } from '../../src/config.ts'
import { countryName, readPlace, writePlace } from '../../src/features/salah/place.ts'

const MUNICH = { salahPlace: 'Munich, Germany; 48.1372, 11.5755; Europe/Berlin; DE' }

const salah = (args: string) => ({
  command: 'salah',
  args,
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 80 },
})

describe('settings', () => {
  test('minutes read as six whole numbers, anything else 0', async () => {
    expect(readAdjust('0 0 0 5 0 -10')).toEqual({ fajr: 0, sunrise: 0, dhuhr: 0, asr: 5, maghrib: 0, isha: -10 })
    expect(readAdjust('3 x 99')).toEqual({ fajr: 3, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 })
    expect(writeAdjust(readAdjust('1 2 3 4 5 6'))).toBe('1 2 3 4 5 6')
  })

  test('an unknown method is auto; a place off the globe or missing a part is unset', async () => {
    expect(readOptions({ salahMethod: 'tehran' }).salahMethod).toBe('auto')
    expect(readOptions({ salahPlace: 'Nowhere; 120, 10; Europe/Berlin; DE' }).salahPlace).toBe(undefined)
    expect(readOptions({ salahPlace: 'Munich; 48.14, 11.58; Europe/Berlin' }).salahPlace).toBe(undefined)
  })

  test('a place reads back as it was written', async () => {
    const place = { name: 'Munich, Germany', latitude: 48.14, longitude: 11.58, timeZone: 'Europe/Berlin', country: 'DE' }

    expect(readPlace(writePlace(place))).toEqual(place)
    expect(countryName('EG')).toBe('Egypt')
  })
})

test('/salah before setup says so', async $ => {
  const ran = await $.command.run(salah(''))

  expect(ran.text).toContain('Prayer times are not set up yet.')
})

test('/salah shows the place, method and today\'s times', { options: MUNICH }, async ($, on) => {
  mock.clock(on, { now: Date.parse('2026-10-10T10:00:00Z') })
  const ran = await $.command.run(salah(''))

  expect(ran.text).toContain('Munich, Germany · Muslim World League')
  expect(ran.text).toContain('Fajr 05:42 · Sunrise 07:26 · Dhuhr 13:02 · Asr 15:59 · Maghrib 18:35 · Isha 20:12')
})

test('/salah adjust and method refuse what they cannot take', { options: MUNICH }, async $ => {
  expect((await $.command.run(salah('adjust asr 90'))).text).toContain('whole minutes from -60 to +60')
  expect((await $.command.run(salah('adjust noon 5'))).text).toContain('whole minutes from -60 to +60')
  expect((await $.command.run(salah('method tehran'))).text).toContain('Method is auto, or one of: mwl, egypt')
})

test('/salah adjust saves one prayer\'s minutes', { options: MUNICH }, async ($, on) => {
  // Stands for the engine's settings writer.
  const written: { key: string; value: unknown }[] = []
  on('config.set', async (_$, e) => (written.push({ key: e.key, value: e.value }), { value: e.value }))

  expect((await $.command.run(salah('adjust Asr +5'))).text).toBe('Asr +5 min')
  expect(written).toEqual([{ key: 'muslim.salahAdjust', value: '0 0 0 5 0 0' }])
})

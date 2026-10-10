import { describe, expect, mock, test } from 'claude-code/testing'

import { readAdjust, readOptions, writeAdjust } from '../../src/config.ts'

const MUNICH = {
  salahCity: 'Munich, Germany',
  salahLatitude: 48.1372,
  salahLongitude: 11.5755,
  salahTimeZone: 'Europe/Berlin',
  salahMethod: 'mwl',
}

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

  test('an unknown method or a place off the globe falls back', async () => {
    const options = readOptions({ salahMethod: 'tehran', salahLatitude: 120, salahLongitude: -200 })

    expect(options.salahMethod).toBe('mwl')
    expect([options.salahLatitude, options.salahLongitude]).toEqual([0, 0])
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
  expect((await $.command.run(salah('method tehran'))).text).toContain('Method is one of: mwl, egypt')
})

test('/salah adjust saves one prayer\'s minutes', { options: MUNICH }, async ($, on) => {
  // Stands for the engine's settings writer.
  const written: { key: string; value: unknown }[] = []
  on('config.set', async (_$, e) => (written.push({ key: e.key, value: e.value }), { value: e.value }))

  expect((await $.command.run(salah('adjust Asr +5'))).text).toBe('Asr +5 min')
  expect(written).toEqual([{ key: 'muslim.salahAdjust', value: '0 0 0 5 0 0' }])
})

import { describe, expect, test } from 'claude-code/testing'

import { cityPrompt, parseCities, parseCoordinates } from '../../src/features/salah/city.ts'

const MUNICH = { name: 'Munich, Germany', country: 'DE', latitude: 48.14, longitude: 11.58, timeZone: 'Europe/Berlin' }

describe('parseCities', () => {
  test('reads the cities in the reply, even with prose around the JSON', { options: { athkar: false } }, async () => {
    expect(parseCities(JSON.stringify({ cities: [MUNICH] }))).toEqual([MUNICH])
    expect(parseCities(`Here you go:\n${JSON.stringify({ cities: [MUNICH] })}\n`)).toEqual([MUNICH])
  })

  test('drops a city that fails a check, and keeps at most 3', { options: { athkar: false } }, async () => {
    const bad = [
      { ...MUNICH, country: 'Germany' },
      { ...MUNICH, latitude: 91 },
      { ...MUNICH, longitude: '11.58' },
      { ...MUNICH, timeZone: 'Mars/Olympus' },
      { ...MUNICH, name: ' ' },
    ]

    expect(parseCities(JSON.stringify({ cities: [...bad, MUNICH] }))).toEqual([MUNICH])
    expect(parseCities(JSON.stringify({ cities: [MUNICH, MUNICH, MUNICH, MUNICH] }))).toHaveLength(3)
  })

  test('an old zone name reads as its zone; coordinates round to two decimals', { options: { athkar: false } }, async () => {
    const [city] = parseCities(JSON.stringify({ cities: [{ ...MUNICH, latitude: 48.13743, timeZone: 'Asia/Calcutta' }] }))

    expect(city?.timeZone).toBe('Asia/Kolkata')
    expect(city?.latitude).toBe(48.14)
  })

  test('no city, or not JSON, is none', { options: { athkar: false } }, async () => {
    expect(parseCities('{"cities":[]}')).toEqual([])
    expect(parseCities('I do not know that place.')).toEqual([])
    expect(parseCities('{"cities": [')).toEqual([])
  })
})

describe('cityPrompt', () => {
  test('carries what the user typed and the country hint', { options: { athkar: false } }, async () => {
    expect(cityPrompt(' ميونخ ', 'DE')).toBe("Place: ميونخ\nHint: the device's time zone is in DE.")
    expect(cityPrompt('Cairo')).toBe('Place: Cairo')
  })
})

describe('parseCoordinates', () => {
  test('reads latitude and longitude typed by hand', { options: { athkar: false } }, async () => {
    expect(parseCoordinates('48.14, 11.58')).toEqual({ latitude: 48.14, longitude: 11.58 })
    expect(parseCoordinates('-33.9 18.4')).toEqual({ latitude: -33.9, longitude: 18.4 })
    expect(parseCoordinates('95, 10')).toBe(undefined)
    expect(parseCoordinates('Munich')).toBe(undefined)
  })
})

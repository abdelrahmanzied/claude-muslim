import { describe, expect, test } from 'claude-code/testing'

import { guessPlace } from '../../src/features/salah/location.ts'
import { COUNTRY_METHODS, METHODS, methodFor } from '../../src/features/salah/methods.ts'
import { ZONE_ALIASES, ZONES } from '../../src/features/salah/zones.ts'

describe('guessPlace', () => {
  test('a zone gives its city and country', async () => {
    expect(guessPlace('Africa/Cairo')).toEqual({
      name: 'Cairo, Egypt', timeZone: 'Africa/Cairo', country: 'EG', latitude: 30.05, longitude: 31.25,
    })
    expect(guessPlace('America/Argentina/Buenos_Aires')?.name).toBe('Buenos Aires, Argentina')
  })

  test('an old zone name reads as its zone', async () => {
    expect(guessPlace('Asia/Calcutta')?.timeZone).toBe('Asia/Kolkata')
    expect(guessPlace('Egypt')?.country).toBe('EG')
  })

  test('an unknown zone gives no guess', async () => {
    expect(guessPlace('UTC')).toBe(undefined)
    expect(guessPlace('Nowhere/City')).toBe(undefined)
  })
})

describe('methods', () => {
  test('each country gets its own method, or mwl', async () => {
    expect(methodFor('EG')).toBe('egypt')
    expect(methodFor('SA')).toBe('ummAlQura')
    expect(methodFor('DE')).toBe('mwl')
  })

  test('every country maps to a known method', async () => {
    for (const method of Object.values(COUNTRY_METHODS)) expect(METHODS[method] !== undefined).toBe(true)
  })

  test('every method sets Isha by angle or by minutes, not both', async () => {
    for (const method of Object.values(METHODS)) {
      expect((method.ishaAngle === undefined) !== (method.ishaMinutes === undefined)).toBe(true)
    }
  })
})

describe('zones', () => {
  test('coordinates are on the globe', async () => {
    for (const [, latitude, longitude] of Object.values(ZONES)) {
      expect(Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180).toBe(true)
    }
  })

  test('every alias points at a zone', async () => {
    for (const zone of Object.values(ZONE_ALIASES)) expect(ZONES[zone] !== undefined).toBe(true)
  })
})

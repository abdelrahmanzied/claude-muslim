// A city the user typed, in any language, to its English name and coordinates:
// the prompt Claude answers, and the checks its reply must pass.

import type { Place } from './place.ts'
import { ZONE_ALIASES, ZONES } from './zones.ts'

export type City = Place

export const CITY_MODEL = 'haiku'

export const CITY_SYSTEM = [
  'You turn a place name a user typed, in any language or spelling, into the cities it can mean.',
  'Answer with JSON only, no prose: {"cities":[{"name":"Munich, Germany","country":"DE","latitude":48.14,"longitude":11.58,"timeZone":"Europe/Berlin"}]}.',
  'name is the city and country in English; country is the ISO 3166-1 alpha-2 code; latitude and longitude are degrees of the city centre to two decimals; timeZone is its IANA time zone.',
  'List up to 3 cities when the name is shared, the likeliest first, preferring the hinted country. Answer {"cities":[]} when it names no real city.',
].join('\n')

export const cityPrompt = (typed: string, hintCountry?: string) =>
  [`Place: ${typed.trim()}`, hintCountry ? `Hint: the device's time zone is in ${hintCountry}.` : ''].filter(Boolean).join('\n')

const isZone = (name: string) => Object.hasOwn(ZONES, name) || Object.hasOwn(ZONE_ALIASES, name)

const toCity = (value: unknown): City | undefined => {
  if (typeof value !== 'object' || value === null) return undefined
  const { name, country, latitude, longitude, timeZone } = value as Record<string, unknown>
  if (typeof name !== 'string' || name.trim() === '') return undefined
  if (typeof country !== 'string' || !/^[A-Z]{2}$/.test(country)) return undefined
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || Math.abs(latitude) > 90) return undefined
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return undefined
  if (typeof timeZone !== 'string' || !isZone(timeZone)) return undefined

  return { name: name.trim(), country, latitude: round2(latitude), longitude: round2(longitude), timeZone: ZONE_ALIASES[timeZone] ?? timeZone }
}

const round2 = (degrees: number) => Math.round(degrees * 100) / 100

// The cities in Claude's reply that pass every check, at most 3; [] for none
// or a reply that is not the JSON asked for.
export const parseCities = (reply: string): City[] => {
  const start = reply.indexOf('{')
  const end = reply.lastIndexOf('}')
  if (start < 0 || end < start) return []
  try {
    const { cities } = JSON.parse(reply.slice(start, end + 1)) as { cities?: unknown }

    return Array.isArray(cities) ? cities.map(toCity).filter((city): city is City => city !== undefined).slice(0, 3) : []
  } catch {
    return []
  }
}

// Coordinates typed as `48.14, 11.58` or `48.14 11.58`, or undefined.
export const parseCoordinates = (typed: string): { latitude: number; longitude: number } | undefined => {
  const match = typed.trim().match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/)
  if (!match) return undefined
  const latitude = Number(match[1])
  const longitude = Number(match[2])

  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : undefined
}

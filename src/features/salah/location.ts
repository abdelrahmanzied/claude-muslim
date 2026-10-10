// A first guess at the user's place from the system's time zone: the city the
// zone is named for, its country, and that country's calculation method.

import { methodFor, type MethodId } from './methods.ts'
import { ZONE_ALIASES, ZONES } from './zones.ts'

export type Place = {
  timeZone: string
  country: string
  latitude: number
  longitude: number
  method: MethodId
}

export const guessPlace = (timeZone: string): Place | undefined => {
  const name = ZONE_ALIASES[timeZone] ?? timeZone
  const zone = ZONES[name]
  if (!zone) return undefined
  const [country, latitude, longitude] = zone
  return { timeZone: name, country, latitude, longitude, method: methodFor(country) }
}

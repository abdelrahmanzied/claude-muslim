// A first guess at the user's place from the system's time zone: the city the
// zone is named for, in its country.

import { countryName, type Place } from './place.ts'
import { ZONE_ALIASES, ZONES } from './zones.ts'

// `America/Argentina/Buenos_Aires` names `Buenos Aires`.
const cityOf = (zone: string) => (zone.split('/').pop() ?? zone).replaceAll('_', ' ')

export const guessPlace = (timeZone: string): Place | undefined => {
  const zone = ZONE_ALIASES[timeZone] ?? timeZone
  const found = ZONES[zone]
  if (!found) return undefined
  const [country, latitude, longitude] = found

  return { name: `${cityOf(zone)}, ${countryName(country)}`, latitude, longitude, timeZone: zone, country }
}

// The system's time zone, or UTC when the runtime has none.
export const systemTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

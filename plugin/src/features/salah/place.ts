// The saved place, one setting so setup writes it in one change:
// `Munich, Germany; 48.14, 11.58; Europe/Berlin; DE`.

export type Place = {
  // As shown to the user: `Munich, Germany`.
  name: string
  latitude: number
  longitude: number
  // IANA time zone the times are shown in.
  timeZone: string
  // ISO 3166 alpha-2, which picks the method when it is auto.
  country: string
}

export const readPlace = (value: unknown): Place | undefined => {
  if (typeof value !== 'string') return undefined
  const [name = '', coordinates = '', timeZone = '', country = ''] = value.split(';').map(part => part.trim())
  const [latitude, longitude] = coordinates.split(',').map(Number)
  if (name === '' || timeZone === '' || !/^[A-Z]{2}$/.test(country)) return undefined
  if (latitude === undefined || !Number.isFinite(latitude) || Math.abs(latitude) > 90) return undefined
  if (longitude === undefined || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return undefined

  return { name, latitude, longitude, timeZone, country }
}

export const writePlace = (place: Place): string =>
  `${place.name.replaceAll(';', ',')}; ${place.latitude}, ${place.longitude}; ${place.timeZone}; ${place.country}`

// A country's English name, or its code without Intl's region names.
export const countryName = (code: string): string => {
  try {
    return new Intl.DisplayNames('en', { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

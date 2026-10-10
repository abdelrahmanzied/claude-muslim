// Today's times for the saved place, as the command and the lines show them.

import type { Options } from '../../config.ts'
import { PRAYERS } from './methods.ts'
import { ENGLISH } from './names.ts'
import { clockText, timesOn, type Where } from './times.ts'

// The system's time zone, or UTC when the runtime has none.
const systemTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export const isSetUp = (options: Options) => options.salahCity !== ''

export const whereOf = (options: Options): Where => ({
  latitude: options.salahLatitude,
  longitude: options.salahLongitude,
  timeZone: options.salahTimeZone || systemTimeZone(),
})

// One line of today's times: `Fajr 05:42 · Sunrise 07:26 · …`.
export const dayLine = (options: Options, at: number): string => {
  const where = whereOf(options)
  const times = timesOn(where, options.salahMethod, options.salahAdjust, at)

  return PRAYERS.map(prayer => `${ENGLISH[prayer]} ${clockText(times[prayer], where.timeZone)}`).join(' · ')
}

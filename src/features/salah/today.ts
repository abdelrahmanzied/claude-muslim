// Today's times for the saved place, as the command and the lines show them.

import type { Options } from '../../config.ts'
import { methodFor, PRAYERS, type MethodId } from './methods.ts'
import { ENGLISH } from '../../shared/pray/names.ts'
import type { Place } from './place.ts'
import { clockText, timesOn } from './times.ts'

// The method in effect: the one set, or the place's country's own.
export const methodOf = (options: Options, place: Place): MethodId =>
  options.salahMethod === 'auto' ? methodFor(place.country) : options.salahMethod

// One line of today's times: `Fajr 05:42 · Sunrise 07:26 · …`.
export const dayLine = (options: Options, place: Place, at: number): string => {
  const times = timesOn(place, methodOf(options, place), options.salahAdjust, at)

  return PRAYERS.map(prayer => `${ENGLISH[prayer]} ${clockText(times[prayer], place.timeZone)}`).join(' · ')
}

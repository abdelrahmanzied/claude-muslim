// The demo's real athan moment; install.tsx plays it with the real timing.
// Pure: chooses the next pray and reply, without changing anything saved.

import type { Options } from '../../config.ts'
import { ENGLISH } from '../../shared/pray/names.ts'
import type { Pray } from './methods.ts'
import type { Place } from './place.ts'
import { clockText, nextSalah } from './times.ts'
import { methodOf } from './today.ts'

export const demoMoment = (next: { pray: Pray; at: number }, timeZone: string) => {
  const pray = next.pray === 'sunrise' ? 'fajr' : next.pray

  return { pray, time: clockText(next.at, timeZone), text: `**Athan demo:** ${ENGLISH[pray]}` }
}

export const athanDemo = (options: Options, place: Place, now: number) =>
  demoMoment(nextSalah(place, methodOf(options, place), options.salahAdjust, now), place.timeZone)

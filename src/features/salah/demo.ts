// The demo's athan moment: the real stages on a short clock, so it opens,
// folds and goes within seconds. Pure: chooses the next pray, the reply and
// the deadlines, without changing anything saved.

import type { SalahCard, SalahMinaret } from '../../../types'
import type { Options } from '../../config.ts'
import { ENGLISH } from '../../shared/pray/names.ts'
import type { Pray } from './methods.ts'
import type { Place } from './place.ts'
import { TOTAL_MS } from './minaret.ts'
import { clockText, nextSalah } from './times.ts'
import { methodOf } from './today.ts'

export const demoMoment = (next: { pray: Pray; at: number }, timeZone: string) => {
  const pray = next.pray === 'sunrise' ? 'fajr' : next.pray

  return { pray, time: clockText(next.at, timeZone), text: `**Athan demo:** ${ENGLISH[pray]}` }
}

export const athanDemo = (options: Options, place: Place, now: number) =>
  demoMoment(nextSalah(place, methodOf(options, place), options.salahAdjust, now), place.timeZone)

// Open this long on the desktop, then folded this long on both surfaces.
export const DEMO_OPEN_MS = 5000
export const DEMO_FOLDED_MS = 3000

// The same states as a real moment, with the demo's deadlines.
export const demoState = (pray: SalahCard['pray'], time: string, now: number): { card: SalahCard; minaret: SalahMinaret } => ({
  card: { pray, time, foldsAt: now + DEMO_OPEN_MS, isFolded: false, until: now + DEMO_OPEN_MS + DEMO_FOLDED_MS },
  minaret: { pray, frame: 1, startedAt: now, foldsAt: now + TOTAL_MS, isFolded: false, until: now + TOTAL_MS + DEMO_FOLDED_MS },
})

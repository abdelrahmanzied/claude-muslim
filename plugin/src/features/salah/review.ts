// The review form: today's times with the user's minutes, one row a pray,
// each moved a minute at a time.

import { PRAYS, type MethodId, type Pray } from './methods.ts'
import { ENGLISH } from '../../shared/pray/names.ts'
import type { Place } from './place.ts'
import { clockText, timesOn, type Adjust } from './times.ts'

export type Row = { pray: Pray; name: string; time: string; minutes: string }

const signed = (minutes: number) => (minutes > 0 ? `+${minutes}` : String(minutes))

export const reviewRows = (place: Place, method: MethodId, draft: Adjust, at: number): Row[] => {
  const times = timesOn(place, method, draft, at)

  return PRAYS.map(pray => ({
    pray,
    name: ENGLISH[pray].padEnd(8),
    time: clockText(times[pray], place.timeZone),
    minutes: signed(draft[pray]).padStart(3),
  }))
}

// The draft with one pray moved by `step` minutes.
export const nudge = (draft: Adjust, pray: Pray, step: number): Adjust => ({
  ...draft,
  [pray]: draft[pray] + step,
})

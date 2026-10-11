// The review form: today's times with the user's minutes, one row a prayer,
// each moved a minute at a time.

import { ADJUST_MAX } from '../../config.ts'
import { PRAYERS, type MethodId, type Prayer } from './methods.ts'
import { ENGLISH } from '../../prayer/names.ts'
import type { Place } from './place.ts'
import { clockText, timesOn, type Adjust } from './times.ts'

export type Row = { prayer: Prayer; name: string; time: string; minutes: string }

const signed = (minutes: number) => (minutes > 0 ? `+${minutes}` : String(minutes))

export const reviewRows = (place: Place, method: MethodId, draft: Adjust, at: number): Row[] => {
  const times = timesOn(place, method, draft, at)

  return PRAYERS.map(prayer => ({
    prayer,
    name: ENGLISH[prayer].padEnd(8),
    time: clockText(times[prayer], place.timeZone),
    minutes: signed(draft[prayer]).padStart(3),
  }))
}

// The draft with one prayer moved by `step` minutes, within ±ADJUST_MAX.
export const nudge = (draft: Adjust, prayer: Prayer, step: number): Adjust => ({
  ...draft,
  [prayer]: Math.max(-ADJUST_MAX, Math.min(ADJUST_MAX, draft[prayer] + step)),
})

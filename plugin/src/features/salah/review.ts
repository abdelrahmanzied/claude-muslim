// The review form: today's times with the user's minutes, one row a pray,
// each typed in its own box.

import { PRAYS, type MethodId, type Pray } from './methods.ts'
import { ENGLISH } from '../../shared/pray/names.ts'
import type { Place } from './place.ts'
import { clockText, timesOn, type Adjust } from './times.ts'
import { typedInteger } from '../../shared/digits/index.ts'

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

// Typed minutes for one pray: any whole number, 0 and negatives included (earlier), in Latin
// or Arabic-Indic digits; anything else is undefined and not saved.
export const typedMinutes = (text: string): number | undefined => typedInteger(text, -Infinity, Infinity)
export const MINUTES_ERROR = 'type whole minutes, like 3, 0 or -3'

// The draft with the typed boxes applied, or the first pray whose text is not a number.
export const withTyped = (draft: Adjust, typed: ReadonlyMap<Pray, string>): { draft: Adjust } | { invalid: Pray } => {
  const next = { ...draft }
  for (const pray of PRAYS) {
    const text = typed.get(pray)
    if (text === undefined) continue
    const minutes = typedMinutes(text)
    if (minutes === undefined) return { invalid: pray }
    next[pray] = minutes
  }
  return { draft: next }
}

// The dim line under the form's title: how to reach a box, what to type and how to keep it.
// The terminal's typing stays in the prompt until ctrl+x tab or a click moves it into the band;
// mobile has no box and changes a pray by command.
export const reviewHint = (surface: string): string =>
  surface === 'mobile'
    ? 'Change one with /salah adjust <pray> <±min> · 5 later, -5 earlier, 0 none'
    : `${surface === 'terminal' ? 'ctrl+x tab or click a box' : 'Click a box'} · 5 later, -5 earlier, 0 none · Enter applies · then Save`

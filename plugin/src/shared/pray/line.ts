// The pray line, its own row above the prompt: the next pray's time, a live mm:ss
// countdown in the minutes before it, and the call once it is in.
// Sunrise has no line and no countdown.

import { countdownMinutes, type Show } from '../../config.ts'
import { arabicDigits } from '../digits/index.ts'
import { ARABIC } from './names.ts'
import type { Pray } from './names.ts'

// How long `حان وقت صلاة …` stays after a pray comes in.
export const IN_MS = 15 * 60_000

export { arabicDigits }

// `دقيقة`, `دقيقتين`, `٣ دقائق` … `١٠ دقائق`, `١١ دقيقة`.
export const minutesText = (minutes: number): string => {
  if (minutes === 1) return 'دقيقة'
  if (minutes === 2) return 'دقيقتين'

  return `${arabicDigits(String(minutes))} ${minutes <= 10 ? 'دقائق' : 'دقيقة'}`
}

// The line once a pray is in, and the words beside the terminal minaret.
export const athanText = (pray: Pray): string => `حان وقت صلاة ${ARABIC[pray]}`

export type Moment = { pray: Pray; at: number }

// What the pray line shows besides the times: when it shows, and whether the
// call shows once a pray is in.
export type View = { show: Show; isAthan: boolean }

const MINUTE_MS = 60_000

// Whether `now` is in the countdown window before the next pray.
export const isInWindow = (next: Moment, now: number, minutes: number): boolean => next.at - now <= minutes * MINUTE_MS && next.at > now

// `mm:ss` in Arabic digits for the time left, rounded up to the second.
export const countdownText = (leftMs: number): string => {
  const seconds = Math.max(1, Math.ceil(leftMs / 1000))
  const pad = (n: number) => String(n).padStart(2, '0')

  return arabicDigits(`${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`)
}

// The line for `now`, given the next pray (never sunrise), the last one and
// its HH:MM; undefined when the line is empty (off, or minutes outside the window).
export const prayLine = (next: Moment, nextClock: string, last: Moment, now: number, view: View): string | undefined => {
  if (view.show === 'off') return undefined
  if (view.isAthan && now >= last.at && now - last.at < IN_MS) return athanText(last.pray)
  const left = next.at - now
  if (left <= countdownMinutes(view.show) * MINUTE_MS) return `☾ ${ARABIC[next.pray]} ${countdownText(left)}`
  if (view.show === 'always') return `☾ ${ARABIC[next.pray]} ${arabicDigits(nextClock)}`

  return undefined
}

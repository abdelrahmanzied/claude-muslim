// The status line under the prompt: the next prayer's time, a countdown in
// the minutes before it, and the call once it is in.
// Sunrise has no line and no reminder.

import type { Prayer } from './methods.ts'
import type { SalahMode } from '../../config.ts'
import { ARABIC } from './names.ts'

// How long `حان وقت صلاة …` stays after a prayer comes in.
export const IN_MS = 15 * 60_000

const DIGITS = '٠١٢٣٤٥٦٧٨٩'

export const arabicDigits = (text: string): string => text.replace(/\d/g, digit => DIGITS[Number(digit)] ?? digit)

// `دقيقة`, `دقيقتين`, `٣ دقائق` … `١٠ دقائق`, `١١ دقيقة`.
export const minutesText = (minutes: number): string => {
  if (minutes === 1) return 'دقيقة'
  if (minutes === 2) return 'دقيقتين'

  return `${arabicDigits(String(minutes))} ${minutes <= 10 ? 'دقائق' : 'دقيقة'}`
}

export type Moment = { prayer: Prayer; at: number }

// What the status line shows besides the times: the mode, the minutes before
// a prayer the countdown starts, and whether the call shows once it is in.
export type View = { mode: SalahMode; reminder: number; isAdhan: boolean }

const MINUTE_MS = 60_000

// The line for `now`, given the next prayer (never sunrise), the last one and
// its HH:MM; undefined when the line is empty (off, or `reminder` outside its window).
export const statusText = (next: Moment, nextClock: string, last: Moment, now: number, view: View): string | undefined => {
  if (view.mode === 'off') return undefined
  if (view.isAdhan && now - last.at < IN_MS) return `حان وقت صلاة ${ARABIC[last.prayer]}`
  const left = next.at - now
  if (left <= view.reminder * MINUTE_MS) return `☾ ${ARABIC[next.prayer]} بعد ${minutesText(Math.max(1, Math.ceil(left / MINUTE_MS)))}`
  if (view.mode === 'always') return `☾ ${ARABIC[next.prayer]} ${arabicDigits(nextClock)}`

  return undefined
}

// The reminder text when `now` is in the `reminder` minutes before a prayer
// not yet reminded of.
export const notifyText = (next: Moment, now: number, notifiedAt: number | null, reminder: number): string | undefined => {
  if (next.prayer === 'sunrise' || notifiedAt === next.at || next.at - now > reminder * MINUTE_MS || next.at <= now) return undefined

  return `صلاة ${ARABIC[next.prayer]} بعد ${minutesText(Math.max(1, Math.ceil((next.at - now) / MINUTE_MS)))}`
}

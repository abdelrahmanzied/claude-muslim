// The prayer line, its own row above the prompt: the next prayer's time, a live mm:ss
// countdown in the minutes before it, and the call once it is in.
// Sunrise has no line and no reminder.

import type { SalahMode } from '../config.ts'
import { ARABIC } from './names.ts'
import type { Prayer } from './names.ts'

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

// The line once a prayer is in, and the words beside the terminal minaret.
export const adhanText = (prayer: Prayer): string => `حان وقت صلاة ${ARABIC[prayer]}`

export type Moment = { prayer: Prayer; at: number }

// What the prayer line shows besides the times: the mode, the minutes before
// a prayer the countdown starts, and whether the call shows once it is in.
export type View = { mode: SalahMode; reminder: number; isAdhan: boolean }

const MINUTE_MS = 60_000

// Whether `now` is in the reminder window before the next prayer.
export const isInWindow = (next: Moment, now: number, reminder: number): boolean => next.at - now <= reminder * MINUTE_MS && next.at > now

// `mm:ss` in Arabic digits for the time left, rounded up to the second.
export const countdownText = (leftMs: number): string => {
  const seconds = Math.max(1, Math.ceil(leftMs / 1000))
  const pad = (n: number) => String(n).padStart(2, '0')

  return arabicDigits(`${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`)
}

// The line for `now`, given the next prayer (never sunrise), the last one and
// its HH:MM; undefined when the line is empty (off, or `reminder` outside its window).
export const prayerLine = (next: Moment, nextClock: string, last: Moment, now: number, view: View): string | undefined => {
  if (view.mode === 'off') return undefined
  if (view.isAdhan && now - last.at < IN_MS) return adhanText(last.prayer)
  const left = next.at - now
  if (left <= view.reminder * MINUTE_MS) return `☾ ${ARABIC[next.prayer]} ${countdownText(left)}`
  if (view.mode === 'always') return `☾ ${ARABIC[next.prayer]} ${arabicDigits(nextClock)}`

  return undefined
}

// The toast text when `now` is in the `reminder` minutes before a prayer
// not yet reminded of.
export const reminderText = (next: Moment, now: number, notifiedAt: number | null, reminder: number): string | undefined => {
  if (next.prayer === 'sunrise' || notifiedAt === next.at || next.at - now > reminder * MINUTE_MS || next.at <= now) return undefined

  return `صلاة ${ARABIC[next.prayer]} بعد ${minutesText(Math.max(1, Math.ceil((next.at - now) / MINUTE_MS)))}`
}

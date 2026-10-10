// The status line under the prompt: the next prayer's time, a countdown in
// the minutes before it, and the call once it is in.

import type { Prayer } from './methods.ts'
import { ARABIC } from './names.ts'

// How long before a prayer the countdown and the notification start.
export const SOON_MS = 20 * 60_000
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

// The line for `now`, given the next prayer, the last one and its HH:MM.
export const statusText = (next: Moment, nextClock: string, last: Moment, now: number): string => {
  if (now - last.at < IN_MS) return `حان وقت صلاة ${ARABIC[last.prayer]}`
  const left = next.at - now
  if (left <= SOON_MS) return `☾ ${ARABIC[next.prayer]} بعد ${minutesText(Math.max(1, Math.ceil(left / 60_000)))}`

  return `☾ ${ARABIC[next.prayer]} ${arabicDigits(nextClock)}`
}

// The notification text when `now` is in the minutes before a prayer not yet
// notified; sunrise ends Fajr and is notified too.
export const notifyText = (next: Moment, now: number, notifiedAt: number | null): string | undefined => {
  if (notifiedAt === next.at || next.at - now > SOON_MS || next.at <= now) return undefined
  const minutes = Math.max(1, Math.ceil((next.at - now) / 60_000))

  return next.prayer === 'sunrise'
    ? `الشروق بعد ${minutesText(minutes)}، آخر وقت الفجر`
    : `صلاة ${ARABIC[next.prayer]} بعد ${minutesText(minutes)}`
}

// Friday's Al-Kahf reminder: when it is due, and for how long it shows. Pure: the
// clock and the pray times come in as numbers; install.tsx keeps what was shown.

import { dayKey, isFriday, KAHF_SURAH } from '../../shared/friday/index.ts'

export { KAHF_SURAH }
// The window opens this long after Jumu'ah (the Dhuhr time) and closes at Maghrib. Fixed, not a setting.
export const KAHF_DELAY_MS = 30 * 60_000
// How long the card stays when nobody closes it.
export const KAHF_CARD_MS = 3 * 60_000

// The words on the card, authored in docs/features/friday/friday-content.md.
export const KAHF_TITLE = 'سورة الكهف'
export const KAHF_PLAY = '▶ استمع'
export const KAHF_BROWSER = '↗ افتح في المتصفح'

// «يوم الجمعة · بصوت <reciter>»: the reciter is the one last used, named as the Quran feature names it; empty until the Quran is ready.
export const kahfSubtitle = (reciter: string): string => (reciter ? `يوم الجمعة · بصوت ${reciter}` : 'يوم الجمعة')
// The terminal's one line: the title and the subtitle.
export const kahfLine = (reciter: string): string => `${KAHF_TITLE} · ${kahfSubtitle(reciter)}`

// The saved place's Dhuhr and Maghrib today (ms); null with no place saved.
export type KahfTimes = { dhuhr: number; maghrib: number } | null

export const kahfWindow = (times: NonNullable<KahfTimes>): { from: number; until: number } =>
  ({ from: times.dhuhr + KAHF_DELAY_MS, until: times.maghrib })

export type KahfInput = {
  now: number
  times: KahfTimes
  // The `fridayKahf` setting: only the automatic reminder; the command always opens it.
  enabled: boolean
  // The day (`dayKey`) the reminder was last shown on, on any session.
  shownDay: string | undefined
  // Another card (athkar, athan) is showing above the prompt.
  isBusy: boolean
}

// `show`: open it now. `wait`: due, but another card is showing; ask again. `no`: not due.
export const kahfDecision = (i: KahfInput): 'show' | 'wait' | 'no' => {
  if (!i.enabled || !i.times || !isFriday(i.now) || i.shownDay === dayKey(i.now)) return 'no'
  const { from, until } = kahfWindow(i.times)
  if (i.now < from || i.now >= until) return 'no'

  return i.isBusy ? 'wait' : 'show'
}

// `/friday` when no prayer place is saved: the automatic reminder has no window to wait for.
export const KAHF_NEEDS_CITY = 'The automatic Al-Kahf reminder needs a city: set one with `/salah city`. `/friday kahf` works without it.'

// What `/friday` says about today.
export const kahfStatus = (now: number, shownDay: string | undefined): string =>
  !isFriday(now) ? 'not Friday' : shownDay === dayKey(now) ? 'shown today' : 'not shown yet today'

// The card showing in a session: the day it belongs to and when it hides. Outside its day or time it is gone.
export const cardAt = (card: { day: string; until: number } | null | undefined, now: number): { day: string; until: number } | null =>
  card && card.day === dayKey(now) && card.until > now ? card : null

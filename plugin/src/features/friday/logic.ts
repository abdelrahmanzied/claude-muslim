// Friday's Al-Kahf reminder: when it is due, and for how long it shows. Pure: the
// clock and the pray times come in as numbers; install.tsx keeps what was shown.

import { dayKey, isFriday, ALKAHF_SURAH } from '../../shared/friday/index.ts'

export { ALKAHF_SURAH }
// The window opens this long after Jumu'ah (the Dhuhr time) and closes at Maghrib. Fixed, not a setting.
export const ALKAHF_DELAY_MS = 30 * 60_000
// How long the card stays when nobody closes it.
export const ALKAHF_CARD_MS = 60_000

// The words on the card, authored in docs/features/friday/friday-content.md.
export const ALKAHF_TITLE = 'سورة الكهف'
export const ALKAHF_PLAY = '▶ استمع'
export const ALKAHF_BROWSER = '↗ افتح في المتصفح'

// «يوم الجمعة · بصوت <reciter>»: the reciter is the one last used, named as the Quran feature names it; empty until the Quran is ready.
export const alkahfSubtitle = (reciter: string): string => (reciter ? `يوم الجمعة · بصوت ${reciter}` : 'يوم الجمعة')
// The terminal's one line: the title and the subtitle.
// The terminal line: no reciter, since the terminal plays no Quran (#45 brings a player there).
export const alkahfLine = (): string => `${ALKAHF_TITLE} · ${alkahfSubtitle('')}`

// The saved place's Dhuhr and Maghrib today (ms); null with no place saved.
export type AlkahfTimes = { dhuhr: number; maghrib: number } | null

export const alkahfWindow = (times: NonNullable<AlkahfTimes>): { from: number; until: number } =>
  ({ from: times.dhuhr + ALKAHF_DELAY_MS, until: times.maghrib })

export type AlkahfInput = {
  now: number
  times: AlkahfTimes
  // The `fridayAlkahf` setting: only the automatic reminder; the command always opens it.
  enabled: boolean
  // The day (`dayKey`) the reminder was last shown on, on any session.
  shownDay: string | undefined
  // Another card (athkar, athan) is showing above the prompt.
  isBusy: boolean
}

// `show`: open it now. `wait`: due, but another card is showing; ask again. `no`: not due.
export const alkahfDecision = (i: AlkahfInput): 'show' | 'wait' | 'no' => {
  if (!i.enabled || !i.times || !isFriday(i.now) || i.shownDay === dayKey(i.now)) return 'no'
  const { from, until } = alkahfWindow(i.times)
  if (i.now < from || i.now >= until) return 'no'

  return i.isBusy ? 'wait' : 'show'
}

// `/friday` when no prayer place is saved: the automatic reminder has no window to wait for.
export const ALKAHF_NEEDS_CITY = 'The automatic Al-Kahf reminder needs a city: set one with `/salah city`. `/friday alkahf` works without it.'

// What `/friday` says about today.
export const alkahfStatus = (now: number, shownDay: string | undefined): string =>
  !isFriday(now) ? 'not Friday' : shownDay === dayKey(now) ? 'shown today' : 'not shown yet today'

// The card showing in a session: the day it belongs to and when it hides. Outside its day or time it is gone.
export const cardAt = (card: { day: string; until: number } | null | undefined, now: number): { day: string; until: number } | null =>
  card && card.day === dayKey(now) && card.until > now ? card : null

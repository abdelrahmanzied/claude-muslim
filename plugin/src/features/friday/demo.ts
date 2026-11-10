// DEMO BEGIN: Friday, all at once, for a fixed Friday; no settings, store or saved state.
import { prayLine } from '../../shared/pray/line.ts'
import { SALAWAT } from '../../shared/thikr/salawat.ts'
import { ALKAHF_TITLE } from './logic.ts'

export const DEMO_MS = 8000
export const DEMO_TICK_MS = 500

export const demoReply = (): string =>
  `**Friday demo:** for ${DEMO_MS / 1000} s, whatever the day: the Al-Kahf card, the pray line with الجمعة in place of الظهر, one Friday salawat on the thikr line and the pane's «${ALKAHF_TITLE}» button. Nothing is saved.`

// The card is showing at `now`, for a demo started at `startedAt`.
export const demoShowing = (startedAt: number, now: number): boolean => now - startedAt < DEMO_MS

// A Friday on the device's own calendar (local 12:30), so Dhuhr is named الجمعة whatever today is.
const NOON = new Date(2026, 9, 9, 12, 30).getTime()
const HOUR_MS = 3_600_000

// The pray line three hours before Jumu'ah, through the real line code.
export const demoPrayLine = (): string =>
  prayLine({ pray: 'dhuhr', at: NOON }, '12:30', { pray: 'fajr', at: NOON - 7 * HOUR_MS }, NOON - 3 * HOUR_MS, { show: 'always', isAthan: false }) ?? ''

// The one salawat on the thikr line, authored with tashkeel (the shared list's first).
export const demoSalawat = (): string => SALAWAT[0] ?? ''
// DEMO END

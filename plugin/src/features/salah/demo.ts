// DEMO BEGIN: fixed Fajr moment, formatted exactly like a real 05:00 moment.
import type { SalahCard, SalahMinaret } from '../../../types'
import { FRIDAY_NOON } from '../../shared/friday/index.ts'
import { TOTAL_MS } from './minaret.ts'
import { clockText } from './times.ts'

const FAJR = clockText(Date.UTC(2000, 0, 1, 5), 'UTC')

// The reply names the command, like the other demos: `**Salah demo:** athan · Fajr 05:00 · athkar after salah`.
export const demoMoment = () => ({
  pray: 'fajr' as const,
  time: FAJR,
  text: `**Salah demo:** athan · Fajr ${FAJR} · athkar after salah`,
})
export const DEMO_OPEN_MS = 5000
export const DEMO_FOLDED_MS = 3000
export const demoDuration = (surface: string) => (surface === 'terminal' ? TOTAL_MS : DEMO_OPEN_MS) + DEMO_FOLDED_MS

// The Friday demo's athan: Dhuhr on a Friday, so it is named الجمعة (its `at` is the Friday the name is read from).
export const demoFridayMoment = () => ({ pray: 'dhuhr' as const, time: clockText(Date.UTC(2000, 0, 1, 12, 30), 'UTC'), at: FRIDAY_NOON })

export const demoState = (now: number, { pray, time }: { pray: SalahCard['pray']; time: string } = demoMoment()): { card: SalahCard; minaret: SalahMinaret } => {
  return {
    card: { pray, time, foldsAt: now + DEMO_OPEN_MS, isFolded: false, until: now + DEMO_OPEN_MS + DEMO_FOLDED_MS },
    minaret: { pray, frame: 1, startedAt: now, foldsAt: now + TOTAL_MS, isFolded: false, until: now + TOTAL_MS + DEMO_FOLDED_MS },
  }
}
// DEMO END

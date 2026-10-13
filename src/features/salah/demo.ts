// DEMO BEGIN: fixed Fajr moment, formatted exactly like a real 05:00 moment.
import type { SalahCard, SalahMinaret } from '../../../types'
import { TOTAL_MS } from './minaret.ts'
import { clockText } from './times.ts'

const FAJR = clockText(Date.UTC(2000, 0, 1, 5), 'UTC')

// The reply names the command, like the other demos: `**Salah demo:** athan · Fajr 05:00`.
export const demoMoment = () => ({
  pray: 'fajr' as const,
  time: FAJR,
  text: `**Salah demo:** athan · Fajr ${FAJR}`,
})
export const DEMO_OPEN_MS = 5000
export const DEMO_FOLDED_MS = 3000
export const demoDuration = (surface: string) => (surface === 'terminal' ? TOTAL_MS : DEMO_OPEN_MS) + DEMO_FOLDED_MS

export const demoState = (now: number): { card: SalahCard; minaret: SalahMinaret } => {
  const { pray, time } = demoMoment()
  return {
    card: { pray, time, foldsAt: now + DEMO_OPEN_MS, isFolded: false, until: now + DEMO_OPEN_MS + DEMO_FOLDED_MS },
    minaret: { pray, frame: 1, startedAt: now, foldsAt: now + TOTAL_MS, isFolded: false, until: now + TOTAL_MS + DEMO_FOLDED_MS },
  }
}
// DEMO END

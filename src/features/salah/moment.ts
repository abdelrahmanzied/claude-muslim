// The athan moment's states and deadlines: open, folded after FOLD_MS, gone
// after CARD_MS. Pure; install.tsx keeps them in $.state and arms the timers.

import type { SalahCard, SalahMinaret } from '../../../types'
import { CARD_MS, FOLD_MS } from './card.ts'
import { TOTAL_MS } from './minaret.ts'

// The moment's states when it begins now. `at` is the pray's time: a late start
// still ends 15 minutes after it, when the footer drops the call.
export const momentState = (pray: SalahCard['pray'], time: string, now: number, at = now): { card: SalahCard; minaret: SalahMinaret } => {
  const until = Math.max(now + 1, at + CARD_MS)

  return {
    card: { pray, time, foldsAt: Math.min(now + FOLD_MS, until), isFolded: false, until },
    minaret: { pray, frame: 1, startedAt: now, foldsAt: Math.min(now + TOTAL_MS, until), isFolded: false, until },
  }
}

// The athan moment's states and deadlines: open, folded after FOLD_MS, gone
// after CARD_MS. Pure; install.tsx keeps them in $.state and arms the timers.

import type { SalahCard, SalahMinaret } from '../../../types'
import { CARD_MS, FOLD_MS } from './card.ts'
import { TOTAL_MS } from './minaret.ts'

// The moment's states when it begins now.
export const momentState = (pray: SalahCard['pray'], time: string, now: number): { card: SalahCard; minaret: SalahMinaret } => ({
  card: { pray, time, foldsAt: now + FOLD_MS, isFolded: false, until: now + CARD_MS },
  minaret: { pray, frame: 1, startedAt: now, foldsAt: now + TOTAL_MS, isFolded: false, until: now + CARD_MS },
})

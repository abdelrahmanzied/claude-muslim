// The call that opens a thikr turn inside a pray's countdown window.
// Pure; the pray name and digits come from the shared pray helpers (src/shared/pray).

import type { SalahWindow } from '../../../types'
import { arabicDigits } from '../../shared/pray/line.ts'
import { ARABIC } from '../../shared/pray/names.ts'
import { CALL_TO_PRAY } from './phrases.ts'

const MINUTE_MS = 60_000

// `حَيَّ عَلَى الصَّلَاةِ · العصر بعد ١٠ د`: whole minutes left (rounded up, at least 1).
export const callText = (window: SalahWindow, now: number): string => {
  const minutes = Math.max(1, Math.ceil((window.at - now) / MINUTE_MS))

  return `${CALL_TO_PRAY} · ${ARABIC[window.pray]} بعد ${arabicDigits(String(minutes))} د`
}

// The window a turn starting at `now` opens with: one still ahead, else none.
export const openWindow = (window: SalahWindow | null, now: number): SalahWindow | undefined =>
  window && window.at > now ? window : undefined

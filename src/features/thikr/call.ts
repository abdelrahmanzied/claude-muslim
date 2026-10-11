// The call that opens a thikr turn inside a prayer's reminder window.
// Pure; the prayer name and digits come from salah's pure helpers.

import type { SalahWindow } from '../../../types'
import { arabicDigits } from '../salah/line.ts'
import { ARABIC } from '../salah/names.ts'
import { CALL_TO_PRAYER } from './phrases.ts'

const MINUTE_MS = 60_000

// `حَيَّ عَلَى الصَّلَاةِ · العصر بعد ١٠ د`: whole minutes left (rounded up, at least 1).
export const callText = (window: SalahWindow, now: number): string => {
  const minutes = Math.max(1, Math.ceil((window.at - now) / MINUTE_MS))

  return `${CALL_TO_PRAYER} · ${ARABIC[window.prayer]} بعد ${arabicDigits(String(minutes))} د`
}

// The window a turn starting at `now` opens with: one still ahead, else none.
export const openWindow = (window: SalahWindow | null, now: number): SalahWindow | undefined =>
  window && window.at > now ? window : undefined

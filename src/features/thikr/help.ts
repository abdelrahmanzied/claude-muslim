// The thikr commands as a table, for `/muslim help`.

import { SPEED_MAX, SPEED_MIN } from '../../config.ts'

export const THIKR_COMMANDS: readonly (readonly [string, string])[] = [
  ['/thikr', 'Show the current settings and help'],
  ['/thikr on` · `off', 'Show tasabih while Claude works'],
  ['/thikr speed auto', 'Reading time: 1s + 0.5s per word'],
  [`/thikr speed <${SPEED_MIN}-${SPEED_MAX}>`, 'Fixed seconds per phrase'],
  ['/thikr end on` · `off', 'تَمَّ بِحَمْدِ اللَّهِ at the end of a turn'],
  ['/thikr mode all` · `salawat', 'Every group in turn, or one salawat for each whole turn'],
]

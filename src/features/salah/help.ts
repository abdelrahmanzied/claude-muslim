// The `/salah help` table: every subcommand and what it does.

import { commandTable } from '../../table.ts'
import { ALWAYS_COUNTDOWN } from '../../config.ts'
import { METHODS } from './methods.ts'

export const SALAH_COMMANDS: readonly (readonly [string, string])[] = [
  ['/salah', 'Today\'s times (next marked), then each setting with the command that changes it'],
  ['/salah help', 'This table'],
  ['/salah show always', `Show the next pray all day, counting down its last ${ALWAYS_COUNTDOWN} min`],
  ['/salah show <minutes>', 'Show it only that many minutes before a pray, counting down; e.g. show 20 (default)'],
  ['/salah show off', 'Hide it'],
  ['/salah athan on` · `off', 'Show حان وقت صلاة … when a pray comes in'],
  ['/salah athan test', 'Play the athan moment now for the next pray (desktop: the athan card); changes nothing'],
  ['/salah city', 'Pick your city (a question, any language)'],
  ['/salah city <name or lat, lng>', 'Set your city by name in any language, or by latitude, longitude'],
  ['/salah method <name>', `auto (the country's own), or: ${Object.keys(METHODS).join(', ')}`],
  ['/salah adjust', 'Match today\'s times to your mosque, a minute at a time'],
  [`/salah adjust <pray> <±min>`, 'Move one pray by any whole number of minutes, e.g. adjust asr +5'],
]

// The host puts `muslim: ` before the first line, so a title goes there, not the table.
export const salahHelp = (): string => `**Muslim › Salah › Help**\n\n${commandTable(SALAH_COMMANDS)}`

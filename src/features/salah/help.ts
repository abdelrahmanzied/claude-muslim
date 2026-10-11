// The `/salah help` table: every subcommand and what it does.

import { commandTable } from '../../table.ts'
import { REMINDER_MAX, REMINDER_MIN } from '../../config.ts'
import { METHODS } from './methods.ts'

export const SALAH_COMMANDS: readonly (readonly [string, string])[] = [
  ['/salah', 'Today\'s times (next marked), then each setting with the command that changes it'],
  ['/salah help', 'This table'],
  ['/salah always', 'Next pray all day, countdown in the reminder window'],
  ['/salah reminder', 'Pray line only in the reminder window (default)'],
  ['/salah off', 'Nothing under the prompt, no reminder'],
  [`/salah reminder <${REMINDER_MIN}-${REMINDER_MAX}>`, 'Minutes before a pray the reminder starts'],
  ['/salah athan on` · `off', 'Show حان وقت صلاة … when a pray comes in'],
  ['/salah athan test', 'Play the athan moment now for the next pray (desktop: the athan card); changes nothing'],
  ['/salah city', 'Pick your city (a question, any language)'],
  ['/salah city <name or lat, lng>', 'Set your city by name in any language, or by latitude, longitude'],
  ['/salah method <name>', `auto (the country's own), or: ${Object.keys(METHODS).join(', ')}`],
  ['/salah adjust', 'Match today\'s times to your mosque, a minute at a time'],
  [`/salah adjust <pray> <±min>`, 'Move one pray by any whole number of minutes, e.g. adjust asr +5'],
]

export const salahHelp = (): string => commandTable(SALAH_COMMANDS)

// The `/salah help` table: each command, what it is, and its options.

import { ALWAYS_COUNTDOWN } from '../../config.ts'
import { helpReply, type HelpRow } from '../../table.ts'
import { METHODS } from './methods.ts'

export const SALAH_COMMANDS: readonly HelpRow[] = [
  ['/salah', 'Pray times. Alone, it shows today\'s times and the settings', ''],
  ['/salah help', 'This table', ''],
  ['/salah show', 'The next pray under the prompt', `\`always\`: all day, counting down its last ${ALWAYS_COUNTDOWN} min · \`<minutes>\`: only that many minutes before a pray, counting down (default 20) · \`off\`: hidden`],
  ['/salah athan', 'حان وقت صلاة … when a pray comes in', '`on` (default) · `off` · `demo`: show, fold and close for the next pray; changes no settings'],
  ['/salah city', 'Your city', 'nothing: pick it by a question, in any language · `<name>`: by name, in any language · `<lat, lng>`: by coordinates'],
  ['/salah method', 'How the times are calculated', `\`auto\` (default): the country's own · or one of: ${Object.keys(METHODS).join(', ')}`],
  ['/salah adjust', 'Match the times to your mosque', 'nothing: today\'s times with − and + per pray · `<pray> <±min>`: move one pray, e.g. `asr +5`'],
]

export const salahHelp = (): string => helpReply('Salah', SALAH_COMMANDS)

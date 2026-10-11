// The `/athkar help` table: every subcommand and what it does.

import { commandTable } from '../../table.ts'

export const ATHKAR_COMMANDS: readonly (readonly [string, string])[] = [
  ['/athkar', 'Today\'s status and the settings; shows the athkar again if hidden'],
  ['/athkar help', 'This table'],
  ['/athkar on` · `off', 'Morning and evening athkar above the prompt'],
  ['/athkar morning reset` · `evening reset', 'Read that period again from the start'],
  ['/athkar style sky` · `frame', 'The look. sky (DESKTOP ONLY, default): a sky that follows the time of day · frame: a plain frame in the main color'],
  ['/athkar color orange` · `green` · `gold` · `blue', 'The main color'],
]

// The host puts `muslim: ` before the first line, so a title goes there, not the table.
export const athkarHelp = (): string => `**Muslim › Athkar › Help**\n\n${commandTable(ATHKAR_COMMANDS)}`

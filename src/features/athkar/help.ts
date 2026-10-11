// The `/athkar help` table: each command, what it is, and its options.

import { helpReply, type HelpRow } from '../../table.ts'

export const ATHKAR_COMMANDS: readonly HelpRow[] = [
  ['/athkar', 'Morning and evening athkar above the prompt. Alone, it shows today\'s status and brings the athkar back if hidden', '`on` (default) · `off`'],
  ['/athkar help', 'This table', ''],
  ['/athkar style', 'The look', '`sky` (DESKTOP ONLY, default): a sky that follows the time of day · `frame`: a plain frame in the main color'],
  ['/athkar morning` · `evening', 'Read that period again from the start', '`reset`'],
]

export const athkarHelp = (): string => helpReply('Athkar', ATHKAR_COMMANDS)

// The `/athkar help` table: each command, what it is, and its options.

import { helpReply, type HelpRow } from '../../table.ts'

export const ATHKAR_COMMANDS: readonly HelpRow[] = [
  ['/athkar', 'Morning, evening and after-salah athkar above the prompt. Alone, it shows today\'s status and brings the athkar back if hidden', '`on` (default) · `off`'],
  ['/athkar after-salah', 'Open Athkar after salah; offered automatically after the athan card duration when prayer times are set; the desktop athan button starts it immediately', '`reset`: read it again from the start'],
  ['/athkar help', 'This table', ''],
  ['/athkar style', 'The look', '`sky` (DESKTOP ONLY, default): a sky that follows the time of day · `frame`: a plain frame in the main color'],
  ['/athkar demo', 'Play the looks without changing the saved reading; alone, uses the current style (terminal: frame)', '`sky` (DESKTOP ONLY): the six skies of the day · `frame`: the four main colors'],
  ['/athkar morning` · `evening', 'Open that period\'s reader above the prompt, even outside its hours', '`reset`: read it again from the start'],
]

export const athkarHelp = (): string => helpReply('Athkar', ATHKAR_COMMANDS)

// The `/athkar help` table: each command, what it is, and its options.

import { helpReply, type HelpRow } from '../../table.ts'

export const ATHKAR_COMMANDS: readonly HelpRow[] = [
  ['/athkar', 'Morning/evening follow Fajr/Maghrib with prayer times, otherwise 05:00/17:00. Alone, it shows today\'s status and brings the athkar back if hidden', ''],
  ['/athkar morning` · `evening` · `after-salah', 'Open that reader above the prompt. `morning` · `evening`: that period\'s athkar, even outside its hours. `after-salah`: the athkar after salah, also offered by itself after the athan card when prayer times are set; the desktop athan button opens it at once', '`reset`: read it again from the start · `on` (default) · `off`: its reminder, opening by itself in its time; off still opens by hand'],
  ['/athkar help', 'This table', ''],
  ['/athkar style', 'The look', '`sky` (DESKTOP ONLY, default): a sky that follows the time of day · `frame`: a plain frame in the main color'],
  ['/athkar color', 'Use the shared main color command: /muslim color', '`orange` · `green` · `yellow` · `blue` (with /muslim color)'],
  ['/athkar demo', 'Play the looks without changing the saved reading; alone, uses the current style (terminal: frame)', '`sky` (DESKTOP ONLY): the six skies of the day · `frame`: the four main colors'],
]

export const athkarHelp = (): string => helpReply('Athkar', ATHKAR_COMMANDS)

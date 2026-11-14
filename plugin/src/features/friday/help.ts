// The `/friday help` table: each command, what it is, and its options.

import { helpReply, type HelpRow } from '../../table.ts'

export const FRIDAY_COMMANDS: readonly HelpRow[] = [
  ['/friday', 'Friday on this device\'s local day: whether it is Friday, the two settings and whether the Al-Kahf reminder was shown today', ''],
  ['/friday help', 'This table', ''],
  ['/friday salawat', 'Salawat on the Prophet in the thikr line on Friday, from Fajr', '`on` (default) · `off`'],
  ['/friday alkahf', 'The Al-Kahf reminder: a card above the prompt, once each Friday, from 30 minutes after Jumu\'ah until Maghrib (needs a saved city); shows for 1 minute; desktop has a button that plays Surat al-Kahf (opens the browser on Windows and Linux). Alone, it shows the card now, on any day', '`on` (default) · `off`: the automatic reminder only; the command still opens it'],
  // DEMO BEGIN: standalone preview; no settings or saved state.
  ['/friday demo', 'Preview on any day: the athan card named Jumu\'ah, then the Al-Kahf card (5 s), each showing and going; changes no settings or saved state', ''],
  // DEMO END
]

export const fridayHelp = (): string => helpReply('Friday', FRIDAY_COMMANDS)

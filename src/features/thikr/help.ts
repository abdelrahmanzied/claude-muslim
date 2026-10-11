// The `/thikr help` table: each command, what it is, and its options.

import { SPEED_MAX, SPEED_MIN } from '../../config.ts'
import { helpReply, type HelpRow } from '../../table.ts'

export const THIKR_COMMANDS: readonly HelpRow[] = [
  ['/thikr', 'Tasbih in Claude\'s working line. Alone, it shows the settings', '`on` (default) · `off`'],
  ['/thikr help', 'This table', ''],
  ['/thikr speed', 'How long each phrase stays', `\`auto\` (default): 1 s + 0.5 s per word · \`<${SPEED_MIN}-${SPEED_MAX}>\`: the same seconds for every phrase`],
  ['/thikr end', 'تَمَّ بِحَمْدِ اللَّهِ in place of Claude\'s word at the end of a turn', '`on` (default) · `off`'],
  ['/thikr mode', 'Which phrases play', '`all` (default): every group in turn · `salawat`: one salawat for each whole turn'],
]

export const thikrHelp = (): string => helpReply('Thikr', THIKR_COMMANDS)

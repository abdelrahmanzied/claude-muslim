import type { HelpRow } from '../../table.ts'
// Quran has no subcommands (removed for v0.1.0): the Muslim pane is the player.
export const QURAN_COMMANDS: readonly HelpRow[] = [
  ['/quran', 'Desktop only: open the Muslim pane with its Quran card unfolded', ''],
]

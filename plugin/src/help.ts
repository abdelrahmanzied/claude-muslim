// `/muslim help`: the shared commands and every feature's table, or one feature's.

import { QURAN_COMMANDS } from './features/quran/help.ts'
import { ATHKAR_COMMANDS } from './features/athkar/help.ts'
import { SALAH_COMMANDS } from './features/salah/help.ts'
import { THIKR_COMMANDS } from './features/thikr/help.ts'
import { helpReply, helpTable, type HelpRow } from './table.ts'

const FEATURES = { thikr: THIKR_COMMANDS, athkar: ATHKAR_COMMANDS, salah: SALAH_COMMANDS, quran: QURAN_COMMANDS } as const

export const MUSLIM_COMMANDS: readonly HelpRow[] = [
  ['/muslim', 'The version, every feature\'s state and the shared settings', ''],
  ['/muslim help', 'Every command table, or one feature\'s', '`<feature>`: thikr, athkar, salah, quran, color, tashkeel, terminal-arabic, update, autoupdate, feedback'],
  ['/muslim color', 'The main color in every feature', '`orange` (default, Claude\'s) · `green` · `yellow` · `blue`'],
  ['/muslim tashkeel', 'Arabic diacritics on desktop; the terminal never shows them', '`on` (default) · `off`'],
  ['/muslim terminal-arabic', 'Choose how Arabic shows in this terminal, for every feature', ''],
  ['/muslim update', 'Update muslim from GitHub and reload plugins; only this plugin, nothing else', ''],
  ['/muslim autoupdate', 'The background update of muslim by Claude Code, on after the first run; alone it shows the state', '`on` · `off`'],
  ['/muslim feedback', 'Report a bug or send a request, idea, content correction or feedback to GitHub; Claude drafts it and sends only after your yes', '`<what you want to say>` (optional)'],
  ['/muslim pane', 'Open the Muslim pane on desktop: today\'s prayers, the Quran player and the athkar progress; a plain text summary in the terminal', ''],
  // DEMO BEGIN: shared demo help.
  ['/muslim demo', 'Play thikr, athkar, /salah demo (athan and athkar after salah) and the Muslim pane tour (desktop) in order; thikr uses tokens and leaves a message in the transcript', ''],
  ['/muslim pane demo', 'Tour the Muslim pane on desktop: cards unfold, play and fold back; nothing is saved', ''],
  // DEMO END
]

const SHARED = { color: 2, tashkeel: 3, 'terminal-arabic': 4, update: 5, autoupdate: 6, feedback: 7 } as const

export const isFeature = (word: string): word is keyof typeof FEATURES => Object.hasOwn(FEATURES, word)

const title = (name: string) => name.charAt(0).toUpperCase() + name.slice(1)

// One feature's table, or all of them under a heading each.
export const muslimHelp = (feature?: string): string => {
  if (feature === undefined || feature === '') {
    return [`**Muslim › Help**\n\n${helpTable(MUSLIM_COMMANDS)}`, ...Object.entries(FEATURES).map(([name, rows]) => `### ${title(name)}\n\n${helpTable(rows)}`)].join('\n\n')
  }
  if (Object.hasOwn(SHARED, feature)) return helpTable([MUSLIM_COMMANDS[SHARED[feature as keyof typeof SHARED]]!])
  if (!isFeature(feature)) return `No feature "${feature}". Features: ${Object.keys(FEATURES).join(', ')}, ${Object.keys(SHARED).join(', ')}.`

  return helpReply(title(feature), FEATURES[feature])
}

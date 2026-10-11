// `/muslim help`: every feature's command table, or one feature's.

import { ATHKAR_COMMANDS } from './features/athkar/help.ts'
import { SALAH_COMMANDS } from './features/salah/help.ts'
import { THIKR_COMMANDS } from './features/thikr/help.ts'
import { commandTable } from './table.ts'

const FEATURES = { thikr: THIKR_COMMANDS, athkar: ATHKAR_COMMANDS, salah: SALAH_COMMANDS } as const

export const COLOR_HELP = '/muslim color orange | green | gold | blue — the main color of the whole mod (default: Claude orange)'
export const TASHKEEL_HELP = '/muslim tashkeel on | off — show or hide Arabic diacritics on desktop (the terminal never shows them)'
export const TERMINAL_ARABIC_HELP = '/muslim terminal-arabic — choose how Arabic shows in this terminal (applies to all features)'

export const isFeature = (word: string): word is keyof typeof FEATURES => Object.hasOwn(FEATURES, word)

// One feature's table, or all of them under a heading each.
export const muslimHelp = (feature?: string): string => {
  if (feature === undefined || feature === '') {
    return COLOR_HELP + '\n' + TASHKEEL_HELP + '\n' + TERMINAL_ARABIC_HELP + '\n\n' + Object.entries(FEATURES).map(([name, rows]) => `**${name}**\n\n${commandTable(rows)}`).join('\n\n')
  }
  if (feature === 'terminal-arabic') return TERMINAL_ARABIC_HELP
  if (feature === 'color') return COLOR_HELP
  if (feature === 'tashkeel') return TASHKEEL_HELP
  if (!isFeature(feature)) return `No feature "${feature}". Features: ${Object.keys(FEATURES).join(', ')}, terminal-arabic, tashkeel, color.`

  // A title first: the host puts `muslim: ` before the first line.
  return `**Muslim › ${feature.charAt(0).toUpperCase()}${feature.slice(1)} › Help**\n\n${commandTable(FEATURES[feature])}`
}

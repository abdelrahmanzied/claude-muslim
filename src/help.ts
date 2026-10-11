// `/muslim help`: every feature's command table, or one feature's.

import { SALAH_COMMANDS } from './features/salah/help.ts'
import { THIKR_COMMANDS } from './features/thikr/help.ts'
import { commandTable } from './table.ts'

const FEATURES = { thikr: THIKR_COMMANDS, salah: SALAH_COMMANDS } as const

export const TERMINAL_ARABIC_HELP = '/muslim terminal-arabic — choose how Arabic shows in this terminal (applies to all features)'

export const isFeature = (word: string): word is keyof typeof FEATURES => Object.hasOwn(FEATURES, word)

// One feature's table, or all of them under a heading each.
export const muslimHelp = (feature?: string): string => {
  if (feature === undefined || feature === '') {
    return TERMINAL_ARABIC_HELP + '\n\n' + Object.entries(FEATURES).map(([name, rows]) => `**${name}**\n\n${commandTable(rows)}`).join('\n\n')
  }
  if (feature === 'terminal-arabic') return TERMINAL_ARABIC_HELP
  if (!isFeature(feature)) return `No feature "${feature}". Features: ${Object.keys(FEATURES).join(', ')}, terminal-arabic.`

  return commandTable(FEATURES[feature])
}

import { isArabicFix } from '../src/shared/arabic/terminal.ts'
import { install as installArabicFix } from '../src/shared/arabic/install.tsx'
import { muslimHelp } from '../src/help.ts'
import type { Register } from 'claude-code'

import { readOptions } from '../src/config.ts'
import { PLUGIN, VERSION } from '../src/constants.ts'
import { install as installThikr } from '../src/features/thikr/install.tsx'

// Entry point. Commands are all registered here (one session.start per module);
// each feature answers its own command. Each feature lives in its own folder under src/features/,
// exports an `install(on, options)` function, and is imported and called
// here by name (the engine requires `on` be handed only to functions
// imported from the mod's own files).
export const register: Register = (on, options) => {
  const settings = readOptions(options)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'muslim',
      description: `Show ${PLUGIN} version, Arabic fix settings, and help`,
    })
    await $.command.register({
      name: 'thikr',
      description: "Tasabih in Claude's working line: on, off, speed, tashkeel, end",
    })

    return next(e)
  })

  on('command.run', { command: 'muslim' }, async ($, e) => {
    const [word = '', feature = ''] = e.args.trim().split(/\s+/)
    if (word === 'arabic-fix') {
      if (feature === '') return { text: `Arabic fix ${settings.arabicFix}. /muslim arabic-fix on | off | auto` }
      if (!isArabicFix(feature) || e.args.trim().split(/\s+/).length !== 2) return { text: 'Arabic fix is auto (detect), on (mod joins and reorders Arabic), or off (terminal shows Arabic itself).' }
      const { deny } = await $.config.set({ key: 'muslim.arabicFix', value: feature })

      return { text: deny ? `Not changed: ${deny}` : `Arabic fix ${feature}` }
    }
    if (word === 'help') return { text: muslimHelp(feature) }
    if (word !== '') return { text: muslimHelp() }

    return { text: `${PLUGIN} v${VERSION}\n\nHelp: /muslim help` }
  })

  installThikr(on, settings)
  installArabicFix(on, settings)
}

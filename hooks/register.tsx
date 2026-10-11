import { isArabicTerminal } from '../src/shared/arabic/terminal.ts'
import type { Register } from 'claude-code'

import { readOptions } from '../src/config.ts'
import { PLUGIN, VERSION } from '../src/constants.ts'
import { muslimHelp } from '../src/help.ts'
import { install as installSalah } from '../src/features/salah/install.tsx'
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
      description: `Show ${PLUGIN} version, and help for every command`,
    })
    await $.command.register({
      name: 'thikr',
      description: "Tasabih in Claude's working line: on, off, speed, tashkeel, end",
    })
    await $.command.register({
      name: 'salah',
      description: 'Prayer times: today, help, always, reminder, off, athan, city, method, adjust',
    })

    // Older versions pinned the prayer line in the status line; clear what a
    // reload may have left there. The mod no longer sets it.
    $.ui.status(undefined)
    // A reload fires this again: ask for a redraw so the salah timer re-arms.
    $.clock.after(0, () => $.ui.invalidate('ui.render'))

    return next(e)
  })

  on('command.run', { command: 'muslim' }, async ($, e) => {
    const [word = '', feature = ''] = e.args.trim().split(/\s+/)
    if (word === 'arabic') {
      if (feature === '') return { text: `Arabic terminal ${settings.arabicTerminal}. /muslim arabic auto | shaped | plain` }
      if (!isArabicTerminal(feature) || e.args.trim().split(/\s+/).length !== 2) return { text: 'Arabic terminal is auto, shaped (mod shapes Arabic), or plain (terminal handles Arabic).' }
      const { deny } = await $.config.set({ key: 'muslim.arabicTerminal', value: feature })

      return { text: deny ? `Not changed: ${deny}` : `Arabic terminal ${feature}` }
    }
    if (word === 'help') return { text: muslimHelp(feature) }
    if (word !== '') return { text: muslimHelp() }

    return { text: `${PLUGIN} v${VERSION}\n\nHelp: /muslim help` }
  })

  installThikr(on, settings)
  installSalah(on, settings)
}

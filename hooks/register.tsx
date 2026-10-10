import type { Register } from 'claude-code'

import { readOptions } from '../src/config.ts'
import { PLUGIN, VERSION } from '../src/constants.ts'
import { install as installAthkar } from '../src/features/athkar/install.tsx'
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
      description: `Show ${PLUGIN} version`,
    })
    await $.command.register({
      name: 'thikr',
      description: "Tasabih in Claude's working line: on, off, speed, tashkeel, end",
    })
    await $.command.register({
      name: 'athkar',
      description: 'Morning and evening athkar above the prompt: on, off, reset, style, color',
    })

    return next(e)
  })

  on('command.run', { command: 'muslim' }, async () => {
    return { text: `${PLUGIN} v${VERSION}` }
  })

  installThikr(on, settings)
  installAthkar(on, settings)
}

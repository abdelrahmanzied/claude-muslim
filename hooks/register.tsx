import type { Register } from 'claude-code'

import { PLUGIN, VERSION } from '../src/constants.ts'

// Entry point. Each feature lives in its own file under src/features/,
// exports an `install(on, options)` function, and is imported and called
// here by name (the engine requires `on` be handed only to functions
// imported from the mod's own files).
export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'muslim',
      description: `Show ${PLUGIN} version`,
    })

    return next(e)
  })

  on('command.run', { command: 'muslim' }, async () => {
    return { text: `${PLUGIN} v${VERSION}` }
  })
}

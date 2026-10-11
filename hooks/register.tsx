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
      description: `Show ${PLUGIN} version, terminal Arabic setup, and help`,
    })
    await $.command.register({
      name: 'thikr',
      description: "Tasabih in Claude's working line: on, off, speed, end",
    })

    return next(e)
  })

  on('command.run', { command: 'muslim' }, async ($, e, next) => {
    const words = e.args.trim().split(/\s+/).filter(Boolean)
    const [word = '', feature = ''] = words
    if (word === 'tashkeel') {
      const value = feature
      if (words.length > 2 || (value !== '' && value !== 'on' && value !== 'off')) return { text: 'Usage: /muslim tashkeel on | off' }
      if (value === '') return { text: `Tashkeel ${settings.tashkeel ? 'on' : 'off'} on desktop; the terminal never shows diacritics. Usage: /muslim tashkeel on | off` }
      const { deny } = await $.config.set({ key: 'muslim.tashkeel', value: value === 'on' })
      return { text: deny ? `Not changed: ${deny}` : `Tashkeel ${value} on desktop; the terminal never shows diacritics` }
    }
    if (word === 'help') return { text: muslimHelp(feature) }
    if (word !== '') return next(e).catch(() => ({ text: muslimHelp() }))

    const onOff = (value: boolean) => (value ? 'on' : 'off')
    // The Arabic setup answers an empty /muslim with this terminal's mode; empty off the terminal.
    const terminal = await next(e).then(result => result.text ?? '', () => '')
    const rows = [
      ['Tashkeel', `${onOff(settings.tashkeel)} — desktop only; the terminal never shows diacritics`, '`/muslim tashkeel on` · `off`'],
      ['Thikr', onOff(settings.thikr), '`/thikr on` · `off` · all options: `/thikr help`'],
      ['Terminal Arabic', terminal || 'terminal only', '`/muslim terminal-arabic`'],
    ]

    return {
      text: [
        `**Muslim** · v${VERSION}`,
        '',
        '### Settings',
        '',
        '| Setting | Value | Change with |',
        '| --- | --- | --- |',
        ...rows.map(row => `| ${row.join(' | ')} |`),
        '',
        'Help: /muslim help',
      ].join('\n'),
    }
  })

  installThikr(on, settings)
  installArabicFix(on, settings)
}

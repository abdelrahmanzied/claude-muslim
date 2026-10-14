import { install as installArabicFix } from '../src/shared/arabic/install.tsx'
import type { EngineInterface, Register } from 'claude-code'

import { readOptions } from '../src/config.ts'
import { PLUGIN, VERSION } from '../src/constants.ts'
import { muslimHelp } from '../src/help.ts'
import { showText } from '../src/features/salah/today.ts'
import { install as installSalah } from '../src/features/salah/install.tsx'
import { install as installQuran } from '../src/features/quran/install.tsx'
import { isCatalog, defaultReciter } from '../src/features/quran/catalog.ts'
import { nearestAvailable } from '../src/features/quran/availability.ts'
import { terminalArabic, defaultArabicMode, isArabicMode, terminalIdFromEnv } from '../src/shared/arabic/terminal.ts'
import { install as installThikr } from '../src/features/thikr/install.tsx'

// $ stays in same-file helpers; Arabic transformation itself is shared pure logic.
async function settingsArabic($: EngineInterface, surface: string, text: string): Promise<string> {
  if (surface !== 'terminal') return text
  const id = terminalIdFromEnv({
    TERM_PROGRAM: await $.env.get('TERM_PROGRAM'),
    TERMINAL_EMULATOR: await $.env.get('TERMINAL_EMULATOR'),
    __CFBundleIdentifier: await $.env.get('__CFBundleIdentifier'),
    WT_SESSION: await $.env.get('WT_SESSION'),
    KONSOLE_VERSION: await $.env.get('KONSOLE_VERSION'),
    VTE_VERSION: await $.env.get('VTE_VERSION'),
    KITTY_WINDOW_ID: await $.env.get('KITTY_WINDOW_ID'),
    ALACRITTY_WINDOW_ID: await $.env.get('ALACRITTY_WINDOW_ID'),
    ALACRITTY_SOCKET: await $.env.get('ALACRITTY_SOCKET'),
    OS: await $.env.get('OS'),
  })
  const cached = (await $.state.get({ plugin: 'muslim', key: 'arabicTerminalMode' })).value
  const saved = await $.store.get('arabicTerminals') as Record<string, unknown> | undefined
  const mode = saved?.[id]
  return terminalArabic(surface, cached?.terminalId === id ? cached.mode : isArabicMode(mode) ? mode : defaultArabicMode(id), text)
}

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
    await $.command.register({
      name: 'salah',
      description: 'Pray times: today, help, show, athan, city, method, adjust',
    })

    await $.command.register({ name: 'quran', description: 'Quran player: play, stop, next, prev, repeat, reciter, help' })
    // Audio handles do not survive a module reload. Never resume stale tracking.
    await $.state.set({ plugin: 'muslim', key: 'quranPlaying' }, null)
    await $.state.set({ plugin: 'muslim', key: 'quranRepeat' }, 'off')
    // Repair restored selection using shipped metadata only; never resume audio.
    const catalog = await $.store.get('quran.catalog').catch(() => undefined)
    const savedReciter = await $.store.get('quran.reciter').catch(() => undefined)
    const reciterKey = isCatalog(catalog) ? (catalog.reciters.find(r => r.key === savedReciter) ?? defaultReciter(catalog)).key : typeof savedReciter === 'string' ? savedReciter : ''
    const storedSurah = (await $.state.get({ plugin: 'muslim', key: 'quranSurah' })).value ?? 1
    const selected = nearestAvailable(reciterKey, storedSurah)
    if (selected !== null && selected !== storedSurah) await $.state.set({ plugin: 'muslim', key: 'quranSurah' }, selected)

    // Older versions pinned the pray line in the status line; clear what a
    // reload may have left there. The mod no longer sets it.
    $.ui.status(undefined)
    // A reload fires this again: ask for a redraw so the salah timer re-arms.
    $.clock.after(0, () => $.ui.invalidate('ui.render'))

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
    const catalog = await $.store.get('quran.catalog')
    const reciterKey = await $.store.get('quran.reciter')
    const reciter = isCatalog(catalog) ? (catalog.reciters.find(r => r.key === reciterKey) ?? defaultReciter(catalog)).label : 'Muhammad Siddiq Al-Minshawi — murattal'
    const surface = await $.session.surface()
    const reciterLabel = await settingsArabic($, surface ?? 'desktop', reciter)
    const rows = [
      ['Tashkeel', `${onOff(settings.tashkeel)} — desktop only; the terminal never shows diacritics`, '`/muslim tashkeel on` · `off`'],
      ['Thikr', onOff(settings.thikr), '`/thikr on` · `off` · all options: `/thikr help`'],
      ['Salah', settings.salahPlace ? showText(settings.salahShow) : 'not set up', '`/salah show always` · `<minutes>` · `off` · all options: `/salah help`'],
      ['Quran', reciterLabel, '`/quran reciter`'],
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
  // First registered SessionMode hook is outermost: Quran prepends to salah.
  installQuran(on, settings)
  installSalah(on, settings)
  installArabicFix(on, settings)
}

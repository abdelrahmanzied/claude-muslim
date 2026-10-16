import { isAccent } from '../src/shared/color/index.ts'
import { install as installArabicFix } from '../src/shared/arabic/install.tsx'
import type { EngineInterface, Register } from 'claude-code'

import { readOptions } from '../src/config.ts'
import { PLUGIN, VERSION } from '../src/constants.ts'
import { install as installAthkar } from '../src/features/athkar/install.tsx'
import { muslimHelp } from '../src/help.ts'
import { helpHint, statusTable } from '../src/table.ts'
import { showText } from '../src/features/salah/today.ts'
import { install as installSalah } from '../src/features/salah/install.tsx'
import { install as installQuran } from '../src/features/quran/install.tsx'
import { isCatalog, defaultReciter } from '../src/features/quran/catalog.ts'
import { nearestAvailable } from '../src/features/quran/availability.ts'
import { terminalArabic, defaultArabicMode, isArabicMode, terminalIdFromEnv } from '../src/shared/arabic/terminal.ts'
import { install as installThikr } from '../src/features/thikr/install.tsx'
import { install as installMuslimPane } from '../src/features/muslim-pane/install.tsx'
import { pendingSwitches } from '../src/features/muslim-pane/settings.ts'

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

// DEMO BEGIN: shared runner, transient module values only. It plays the demos in order
// and waits for each to report its end; it knows no demo's length or values.
import { startDemo, onDemoDone, onDemoFailure } from '../src/shared/demo/signal.ts'
import { DEMO_STEPS, DEMO_GAP_MS, DEMO_START_MS, demoReply } from '../src/demo.ts'

type DemoRun = { step: number; timer?: { cancel: () => void } }
let demo: DemoRun | undefined

const stopDemo = (playing: DemoRun) => {
  if (demo !== playing) return
  playing.timer?.cancel()
  demo = undefined
  onDemoFailure()
  onDemoDone()
}

// Signals run after the command has returned; each connected starter owns its feature's $.
const runDemoStep = async (playing: DemoRun, step: number) => {
  if (demo !== playing) return
  playing.step = step
  try {
    await startDemo(DEMO_STEPS[step]!)
  } catch {
    stopDemo(playing)
  }
}

const playDemo = async ($: EngineInterface): Promise<string> => {
  if (demo) return '**Muslim demo:** already playing.'
  const playing: DemoRun = { step: 0 }
  demo = playing
  onDemoFailure(() => stopDemo(playing))
  onDemoDone(feature => {
    if (demo !== playing || feature !== DEMO_STEPS[playing.step]) return
    const next = playing.step + 1
    if (next >= DEMO_STEPS.length) return stopDemo(playing)
    playing.timer = $.clock.after(DEMO_GAP_MS, () => void runDemoStep(playing, next))
  })
  playing.timer = $.clock.after(DEMO_START_MS, () => void runDemoStep(playing, 0))

  return demoReply()
}
// DEMO END

// Entry point. Commands are all registered here (one session.start per module);
// each feature answers its own command. Each feature lives in its own folder under src/features/,
// exports an `install(on, options)` function, and is imported and called
// here by name (the engine requires `on` be handed only to functions
// imported from the mod's own files).
export const register: Register = (on, options) => {
  const settings = readOptions(options)

  on('session.start', async ($, e, next) => {
    // Runs on config reload too. Clear confirmed switches outside ui.render.
    const optimisticRef = { plugin: 'muslim', key: 'paneOptimistic' } as const
    const optimistic = await $.state.get(optimisticRef)
    const pending = pendingSwitches(settings, optimistic.value)
    if (Object.keys(pending).length !== Object.keys(optimistic.value ?? {}).length) await $.state.set(optimisticRef, pending, { ifVersion: optimistic.version })
    await $.command.register({
      name: 'muslim',
      description: `Show ${PLUGIN} version, terminal Arabic setup, the Muslim pane, and help`,
    })
    await $.command.register({
      name: 'thikr',
      description: "Tasabih in Claude's working line: on, off, speed, end",
    })
    await $.command.register({
      name: 'athkar',
      description: 'Morning, evening and after-salah athkar above the prompt: help, on, off, reset, style',
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
    // DEMO BEGIN: command entry; no feature settings or saved state.
    if (word === 'demo') {
      if (words.length !== 1) return { text: 'Usage: /muslim demo' }
      if (demo) return { text: '**Muslim demo:** already playing.' }
      // Walk the demo-only setup hooks once; no self-command dispatch.
      await next(e)

      return { text: await playDemo($) }
    }
    // DEMO END
    if (word === 'color') {
      // "gold" is the old name of "yellow".
      const pick = feature === 'gold' ? 'yellow' : feature
      if (words.length > 2 || (pick !== '' && !isAccent(pick))) return { text: 'Usage: /muslim color orange | green | yellow | blue' }
      if (pick === '') return { text: `Color ${settings.color}. Usage: /muslim color orange | green | yellow | blue` }
      const { deny } = await $.config.set({ key: 'muslim.color', value: pick })
      return { text: deny ? `Not changed: ${deny}` : `Color ${pick}` }
    }
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
        `${helpHint('/muslim')}; each feature's: \`/thikr help\` · \`/athkar help\` · \`/salah help\` · \`/quran help\``,
        '',
        '### Features',
        '',
        statusTable([
          ['Thikr', 'Tasbih in Claude\'s working line', onOff(settings.thikr)],
          ['Athkar', 'Morning, evening and after-salah athkar above the prompt', onOff(settings.athkar)],
          ['Salah', 'Pray times and the next pray under the prompt', settings.salahPlace ? showText(settings.salahShow) : 'not set up'],
          ['Quran', 'Desktop recitation player; the selected recording', reciterLabel],
        ], 'Feature'),
        '',
        '### Shared',
        '',
        statusTable([
          ['Color', 'The main color in every feature', settings.color],
          ['Tashkeel', 'Arabic diacritics on desktop; the terminal never shows them', onOff(settings.tashkeel)],
          ['Terminal Arabic', 'How Arabic shows in this terminal', terminal || 'terminal only'],
        ]),
      ].join('\n'),
    }
  })

  // DEMO BEGIN: a session end stops the shared demo.
  on('session.end', async (_$, e, next) => {
    if (demo) stopDemo(demo)

    return next(e)
  })
  // DEMO END

  installThikr(on, settings)
  installAthkar(on, settings)
  // First registered SessionMode hook is outermost: the pane chip prepends to Quran's, which prepends to salah's.
  installMuslimPane(on, settings)
  installQuran(on, settings)
  installSalah(on, settings)
  installArabicFix(on, settings)
}

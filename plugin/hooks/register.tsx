import { setupForm } from '../src/shared/setup/visibility.ts'
import { SETUP_LATER_KEY } from '../src/shared/pray/first-run.ts'
import { configFailure, hasConfigRow, MISSING_CONFIG } from '../src/shared/reload/config.ts'
import { stopBeforeReload } from '../src/shared/reload/signal.ts'
import { isAccent } from '../src/shared/color/index.ts'
import { install as installArabicFix } from '../src/shared/arabic/install.tsx'
import type { EngineInterface, Register } from 'claude-code'

import { readOptions } from '../src/config.ts'
import { PLUGIN, VERSION } from '../src/constants.ts'
import { AUTOUPDATE_USAGE, autoUpdateState, changedReply, noEntry, notChanged, parseSettings, settingsPath, shouldSeed, stateText, statusReply, unreadable, withAutoUpdate, type AutoUpdateState } from '../src/autoupdate.ts'
import { FEEDBACK_SUBMIT_MS, feedbackPrompt } from '../src/feedback.ts'
import { failedToRun, parseUpdate, updateReply, UPDATE_ARGV, UPDATE_TIMEOUT_MS, type UpdateResult } from '../src/update.ts'
import { install as installAthkar } from '../src/features/athkar/install.tsx'
import { muslimHelp } from '../src/help.ts'
import { helpHint, statusTable } from '../src/table.ts'
import { showText } from '../src/features/salah/today.ts'
import { install as installSalah } from '../src/features/salah/install.tsx'
import { install as installQuran } from '../src/features/quran/install.tsx'
import { defaultReciter } from '../src/features/quran/catalog.ts'
import { QURAN_CATALOG } from '../src/features/quran/catalog-data.ts'
import { nearestAvailable } from '../src/features/quran/availability.ts'
import { MODES_KEY, terminalArabic, defaultArabicMode, isArabicMode, terminalIdFromEnv } from '../src/shared/arabic/terminal.ts'
import { install as installThikr } from '../src/features/thikr/install.tsx'
import { install as installMuslimPane } from '../src/features/muslim-pane/install.tsx'
import { connectAutoUpdate, connectPanelAction } from '../src/shared/panel/signal.ts'

// $ stays in same-file helpers; Arabic transformation itself is shared pure logic.
async function setupShowing($: EngineInterface, hasPlace: boolean): Promise<boolean> {
  const surface = await $.session.surface().catch(() => 'desktop' as const) ?? 'desktop'
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
  return !!setupForm({ surface, hasSurvey: false, hasPlace,
    hasReview: !!(await $.state.get({ plugin: 'muslim', key: 'salahReview' })).value,
    later: (await $.state.get({ plugin: 'muslim', key: 'salahSetupLater' })).value === true || await $.store.get(SETUP_LATER_KEY) === true,
    terminal: surface === 'terminal' ? { id, manual: (await $.state.get({ plugin: 'muslim', key: 'arabicSurveyManualTerminal' })).value, saved: await $.store.get(MODES_KEY) as Record<string, unknown> | undefined } : undefined,
  })
}

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
  const saved = await $.store.get(MODES_KEY) as Record<string, unknown> | undefined
  const mode = saved?.[id]
  return terminalArabic(surface, cached?.terminalId === id ? cached.mode : isArabicMode(mode) ? mode : defaultArabicMode(id), text)
}

// `claude` on PATH; the engine gives no path to its own binary. Without a shell a Windows
// `claude.cmd` shim does not start, so a failed start retries through `cmd /c` there.
async function runUpdate($: EngineInterface): Promise<UpdateResult> {
  const run = (argv: readonly string[]) => $.process.run(argv, { timeoutMs: UPDATE_TIMEOUT_MS })
  try {
    let done
    try {
      done = await run(UPDATE_ARGV)
    } catch (error) {
      if ((await $.env.get('OS')) !== 'Windows_NT') throw error
      done = await run(['cmd', '/c', ...UPDATE_ARGV])
    }
    return parseUpdate(done.stdout, done.stderr, done.exitCode)
  } catch (error) {
    return failedToRun(error)
  }
}

// The user's settings.json: CLAUDE_CONFIG_DIR, else HOME or USERPROFILE.
async function userSettingsFile($: EngineInterface): Promise<string | undefined> {
  return settingsPath({ config: await $.env.get('CLAUDE_CONFIG_DIR'), home: await $.env.get('HOME'), profile: await $.env.get('USERPROFILE') })
}

async function readAutoUpdate($: EngineInterface): Promise<AutoUpdateState | 'unknown'> {
  try {
    return autoUpdateState(await $.settings.read({ source: 'user' }))
  } catch {
    return 'unknown'
  }
}

// Changes only extraKnownMarketplaces["claude-muslim"].autoUpdate; a missing entry or a file
// that is not valid JSON is never written. Returns the reason it did not write, or undefined.
async function writeAutoUpdate($: EngineInterface, value: boolean): Promise<string | undefined> {
  try {
    const path = await userSettingsFile($)
    if (!path) return notChanged('could not find your home folder')
    const parsed = parseSettings(await $.fs.read(path))
    if (!parsed.ok) return unreadable(parsed.reason)
    const text = withAutoUpdate(parsed.data, value)
    if (text === undefined) return noEntry
    await $.fs.write(path, text)
    return undefined
  } catch (error) {
    return notChanged(error instanceof Error ? error.message.split('\n')[0]! : 'could not read or write your settings')
  }
}

// The pane uses the same reader and writer as /muslim autoupdate, without chat output.
async function reconcilePaneAutoUpdate($: EngineInterface): Promise<void> {
  const ref = { plugin: 'muslim', key: 'paneAutoUpdate' } as const
  const held = await $.state.get(ref)
  const state = await readAutoUpdate($)
  if (typeof held.value === 'boolean' && state !== 'unknown' && state !== 'missing' && (state === 'on') === held.value) {
    await $.state.set(ref, null, { ifVersion: held.version })
  }
}
function connectAutoUpdateToPanel($: EngineInterface): void {
  connectAutoUpdate(() => readAutoUpdate($))
  connectPanelAction('muslim-autoupdate', async value => {
    if (value !== 'on' && value !== 'off') return
    const failed = await writeAutoUpdate($, value === 'on')
    if (failed) {
      const ref = { plugin: 'muslim', key: 'paneAutoUpdate' } as const
      const held = await $.state.get(ref)
      if (held.value === (value === 'on')) await $.state.set(ref, null, { ifVersion: held.version })
      $.ui.toast(failed)
    } else {
      await reconcilePaneAutoUpdate($)
      $.ui.invalidate('ui.render')
    }
  })
}

// The first run turns auto-update on once and records it, so a later "off" stays off.
// Nothing here may fail the session: any problem just means "try again next start".
async function seedAutoUpdate($: EngineInterface) {
  try {
    if (await $.store.get('autoUpdateSeeded')) return
    const path = await userSettingsFile($)
    if (!path) return
    const parsed = parseSettings(await $.fs.read(path))
    if (!parsed.ok || autoUpdateState(parsed.data) === 'missing') return
    if (shouldSeed(parsed.data) && (await writeAutoUpdate($, true)) !== undefined) return
    await $.store.set('autoUpdateSeeded', true)
  } catch {}
}

// The host refuses a submit made while the command still runs, so the turn starts from a timer
// just after the reply. A refused or dropped submit gets a toast, never a silent nothing.
async function startFeedback($: EngineInterface, text: string) {
  const prompt = feedbackPrompt({
    version: VERSION,
    surface: await $.session.surface(),
    os: (await $.env.get('OS')) === 'Windows_NT' ? 'Windows' : undefined,
    text,
  })
  const failed = () => $.ui.toast('Could not start the feedback. Run /muslim feedback again.')
  $.clock.after(FEEDBACK_SUBMIT_MS, () => {
    $.prompt.submit({ text: prompt }).then(result => result.drop === undefined || failed(), failed)
  })
}

// A command cannot run another from its own hook, so the reload comes from a timer.
function reloadPlugins($: EngineInterface) {
  $.clock.after(500, () => {
    void $.command.run({ command: 'reload-plugins' }).catch(() => $.ui.toast('muslim updated. Run /reload-plugins to load it.'))
  })
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
    await $.command.register({
      name: 'muslim',
      description: `Show ${PLUGIN} version, terminal Arabic setup, the Muslim pane, and help`,
    })
    await $.command.register({
      name: 'thikr',
      description: "Tasabih in Claude's working line: help, on, off, speed, end, mode, demo",
    })
    await $.command.register({
      name: 'athkar',
      description: 'Morning, evening and after-salah athkar above the prompt: help, morning, evening, after-salah, style, color, demo',
    })
    await $.command.register({
      name: 'salah',
      description: 'Pray times: help, show, athan, city, method, adjust, demo',
    })

    await $.command.register({ name: 'quran', description: 'Quran player: play, stop, next, prev, repeat, reciter, retry, help' })
    // Audio handles do not survive a module reload. Never resume stale tracking.
    await $.state.set({ plugin: 'muslim', key: 'quranPlaying' }, null)
    await $.state.set({ plugin: 'muslim', key: 'quranRepeat' }, 'off')
    // Repair restored selection using shipped metadata only; never resume audio.
    const savedReciter = await $.store.get('quran.reciter').catch(() => undefined)
    const reciterKey = (QURAN_CATALOG.reciters.find(r => r.key === savedReciter) ?? defaultReciter(QURAN_CATALOG)).key
    const storedSurah = (await $.state.get({ plugin: 'muslim', key: 'quranSurah' })).value ?? 1
    const selected = nearestAvailable(reciterKey, storedSurah)
    if (selected !== null && selected !== storedSurah) await $.state.set({ plugin: 'muslim', key: 'quranSurah' }, selected)

    // A reload fires this again: ask for a redraw so the salah timer re-arms.
    $.clock.after(0, () => $.ui.invalidate('ui.render'))

    await seedAutoUpdate($)
    await reconcilePaneAutoUpdate($)

    return next(e)
  })

  on('command.run', { command: 'muslim' }, async ($, e, next) => {
    const words = e.args.trim().split(/\s+/).filter(Boolean)
    const [word = '', feature = ''] = words
    // DEMO BEGIN: command entry; no feature settings or saved state.
    if (word === 'demo') {
      if (demo) return { text: '**Muslim demo:** already playing.' }
      // `/muslim demo pane` is the pane tour alone; the muslim-pane feature answers it.
      if (words.length === 2 && feature === 'pane') return next(e)
      if (words.length !== 1) return { text: 'Usage: /muslim demo [pane]' }
      // Walk the demo-only setup hooks once; no self-command dispatch.
      await next(e)

      return { text: await playDemo($) + (await setupShowing($, !!settings.salahPlace) ? ' It shows once the setup above is answered.' : '') }
    }
    // DEMO END
    if (word === 'color') {
      const pick = feature
      if (words.length > 2 || (pick !== '' && !isAccent(pick))) return { text: 'Usage: /muslim color orange | green | yellow | blue' }
      if (pick === '') return { text: `Color ${settings.color}. Usage: /muslim color orange | green | yellow | blue` }
      try {
        if (!hasConfigRow(await $.config.list(), 'muslim.color')) return { text: MISSING_CONFIG }
        await stopBeforeReload()
        const { deny } = await $.config.set({ key: 'muslim.color', value: pick })
        return { text: deny ? configFailure(deny) : `Color ${pick}` }
      } catch (error) { return { text: configFailure(error) } }
    }
    if (word === 'tashkeel') {
      const value = feature
      if (words.length > 2 || (value !== '' && value !== 'on' && value !== 'off')) return { text: 'Usage: /muslim tashkeel on | off' }
      if (value === '') return { text: `Tashkeel ${settings.tashkeel ? 'on' : 'off'} on desktop; the terminal never shows diacritics. Usage: /muslim tashkeel on | off` }
      try {
        if (!hasConfigRow(await $.config.list(), 'muslim.tashkeel')) return { text: MISSING_CONFIG }
        await stopBeforeReload()
        const { deny } = await $.config.set({ key: 'muslim.tashkeel', value: value === 'on' })
        return { text: deny ? configFailure(deny) : `Tashkeel ${value} on desktop; the terminal never shows diacritics` }
      } catch (error) { return { text: configFailure(error) } }
    }
    if (word === 'update') {
      if (words.length !== 1) return { text: 'Usage: /muslim update' }
      $.ui.toast('Updating muslim…', { timeoutMs: 8000 })
      const reply = updateReply(await runUpdate($), VERSION)
      if (reply.reload) reloadPlugins($)
      return { text: reply.text }
    }
    if (word === 'autoupdate') {
      if (words.length > 2 || (feature !== '' && feature !== 'on' && feature !== 'off')) return { text: AUTOUPDATE_USAGE }
      if (feature === '') return { text: statusReply(await readAutoUpdate($)) }
      const failed = await writeAutoUpdate($, feature === 'on')
      return { text: failed ?? changedReply(feature === 'on') }
    }
    if (word === 'feedback') {
      await startFeedback($, e.args.trim().slice('feedback'.length))
      return { text: 'Feedback: Claude will ask what kind it is and show you a draft. Nothing is sent until you say yes.' }
    }
    if (word === 'help') return { text: await settingsArabic($, await $.session.surface().catch(() => 'desktop' as const) ?? 'desktop', muslimHelp(feature)) }
    if (word !== '') return next(e).catch(() => ({ text: muslimHelp() }))

    const surfaces = await $.session.surfaces()
    if (surfaces.includes('desktop') && !surfaces.includes('terminal')) {
      try {
        const answer = await next(e)
        if (answer.text) return answer
      } catch { /* Opening failed: keep the existing table fallback. */ }
    }

    const onOff = (value: boolean) => (value ? 'on' : 'off')
    // The Arabic setup answers an empty /muslim with this terminal's mode; empty off the terminal.
    const terminal = surfaces.includes('desktop') && !surfaces.includes('terminal') ? '' : await next(e).then(result => result.text ?? '', () => '')
    const reciterKey = await $.store.get('quran.reciter')
    const reciter = (QURAN_CATALOG.reciters.find(r => r.key === reciterKey) ?? defaultReciter(QURAN_CATALOG)).label
    const surface = await $.session.surface()
    const reciterLabel = await settingsArabic($, surface ?? 'desktop', reciter)
    const autoUpdate = await readAutoUpdate($)

    return {
      text: [
        `**Muslim** · v${VERSION}`,
        `${helpHint('/muslim')}; each feature's: \`/thikr help\` · \`/athkar help\` · \`/salah help\` · \`/quran help\``,
        '',
        '### Features',
        '',
        statusTable([
          ['Thikr', 'Tasbih in Claude\'s working line', onOff(settings.thikr)],
          ['Athkar', 'Morning, evening and after-salah athkar above the prompt; reminders morning · evening · after salah', [settings.athkarMorning, settings.athkarEvening, settings.athkarAfterSalah].map(onOff).join(' · ')],
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
          ['Auto-update', 'Claude Code updates muslim in the background', stateText(autoUpdate)],
        ]),
      ].join('\n'),
    }
  }).catch(() => ({ text: 'Could not complete the command. Try again.' }))

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
  on('ui.render', { component: 'Pane', requestId: 'muslim' }, async ($, e, next) => {
    connectAutoUpdateToPanel($)
    // Drawing only reads state; confirmation cleanup runs after the render.
    if (typeof (await $.state.get({ plugin: 'muslim', key: 'paneAutoUpdate' })).value === 'boolean') {
      $.clock.after(0, () => { void reconcilePaneAutoUpdate($) })
    }
    return next(e)
  })
  on('ui.message', { element: 'muslim-pane' }, async ($, e, next) => {
    connectAutoUpdateToPanel($)
    if (typeof (await $.state.get({ plugin: 'muslim', key: 'paneAutoUpdate' })).value === 'boolean') {
      await reconcilePaneAutoUpdate($)
    }
    return next(e)
  })
  installQuran(on, settings)
  installSalah(on, settings)
  installArabicFix(on, settings)
}

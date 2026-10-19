import { configFailure, hasConfigRow, MISSING_CONFIG } from '../../shared/reload/config.ts'
import { setupForm } from '../../shared/setup/visibility.ts'
import { stopBeforeReload } from '../../shared/reload/signal.ts'
import { isDarkTheme } from '../../shared/color/index.ts'
import { defaultArabicMode, isArabicMode, terminalArabic, terminalIdFromEnv, type ArabicMode } from '../../shared/arabic/terminal.ts'
import { atom, read } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'

import type { Day, SalahCard, SalahLast, SalahAthkarTimes } from '../../../types'
import type { Options } from '../../config.ts'
import { withTashkeel } from '../../shared/arabic/visual.ts'
import { connectAthkar, connectPanelAction, type PanelAthkar } from '../../shared/panel/signal.ts'
import { athkarTimesAt } from '../../shared/pray/bounds.ts'
import { mayOpenByItself, REMIND_FROM_KEY, SETUP_LATER_KEY, readRemindFrom, setupPending } from '../../shared/pray/first-run.ts'
import { helpHint, statusTable } from '../../table.ts'
import { athkarHelp } from './help.ts'
import { CELL_PX, FOCUS_GRACE_MS, IDLE_MS, isCardMessage, KEY_REST_MS, LEAVE_MS, LINE_PX, REST_PX } from '../../shared/card/card.ts'
import { bandHeight, closeArea, pixelOf, questionAreas } from './band.ts'
import type { BandModel } from './band.ts'
import { canUndoReset, resetReading, resetSnapshot, setNamed, undoReset, UNDO_MS, type ResetSnapshot } from './reset.ts'
import type { AthkarSet } from './logic.ts'
import { ADVANCE_MS, asksToFinish, countKey, countOf, currentOf, dayOf, emptyReading, END, hasBegun, holdsFinished, listFor, mayOpenPeriod, overall, offerStart, offerEnd, nextPeriodAt, questionKey, setAt, syncAfterSalah, readDay, shouldAdvance, skyOn, step, textOf, timesOf, TITLE } from './logic.ts'
import type { Act, FinishedHold, FinishQuestion, Reading } from './logic.ts'
import { lookFor, plain, readerProps, resetHint } from './look.ts'
import type { Style } from './look.ts'

// DEMO BEGIN: imports and transient runner (no saved state or real view).
import type { Accent } from '../../shared/color/index.ts'
import { demoDuration, demoReply, demoStep, DEMO_TICK_MS, type DemoSet } from './demo.ts'
import { connectDemo, doneDemo } from '../../shared/demo/signal.ts'

// shared: started by /muslim demo, which waits for this demo's end.
let demo: { style: Style; accent: Accent; startedAt: number; shared: boolean; set: DemoSet; finished?: () => void; timer?: { cancel: () => void } } | undefined
const demoArabicCache: { current: { terminalId: string; mode: ArabicMode } | null } = { current: null }

const tickDemo = async ($: EngineInterface) => {
  const playing = demo
  if (!playing) return
  const now = await $.clock.now()
  if (demo !== playing) return
  if (now - playing.startedAt >= demoDuration(playing.style, FINALE_MS, playing.set)) {
    playing.timer?.cancel()
    demo = undefined
    $.ui.invalidate('ui.render')
    playing.finished?.()
    if (playing.shared) doneDemo('athkar')
    return
  }
  $.ui.invalidate('ui.render')
}

const playDemo = async ($: EngineInterface, style: Style, accent: Accent, shared = false, set: DemoSet = 'daily', finished?: () => void) => {
  demo?.timer?.cancel()
  demo?.finished?.()
  demo = { style, accent, startedAt: await $.clock.now(), shared, set, finished }
  demo.timer = $.clock.every(DEMO_TICK_MS, () => void tickDemo($))
  $.ui.invalidate('ui.render')

  return set === 'daily' ? demoReply(style, FINALE_MS) : 'Athkar after salah demo'
}

// Both commands connect this starter with this file's own engine handle.
const connectAfterSalahDemo = ($: EngineInterface, options: Options) => {
  connectDemo('afterSalah', async finished => playDemo($, await $.session.surface() === 'terminal' ? 'frame' : options.athkarStyle, options.color, false, 'afterSalah', finished), () => {
    if (demo?.set !== 'afterSalah') return
    const playing = demo
    playing.timer?.cancel()
    demo = undefined
    playing.finished?.()
    $.ui.invalidate('ui.render')
  })
}

// DEMO END
// The engine follows $ only into same-file top-level functions, so the
// terminal's Arabic mode is resolved here as in thikr and salah.
const cachedArabicMode = atom({ plugin: 'muslim', key: 'arabicTerminalMode' } as const, null as { terminalId: string; mode: ArabicMode } | null)

const terminalId = async ($: EngineInterface): Promise<string> => {
  const termProgram = await $.env.get('TERM_PROGRAM')
  if (termProgram) return terminalIdFromEnv({ TERM_PROGRAM: termProgram })
  const emulator = await $.env.get('TERMINAL_EMULATOR')
  if (emulator) return terminalIdFromEnv({ TERMINAL_EMULATOR: emulator })
  const bundle = await $.env.get('__CFBundleIdentifier')
  if (bundle) return terminalIdFromEnv({ __CFBundleIdentifier: bundle })
  const windowsTerminal = await $.env.get('WT_SESSION')
  if (windowsTerminal !== undefined) return terminalIdFromEnv({ WT_SESSION: windowsTerminal })
  const konsole = await $.env.get('KONSOLE_VERSION')
  if (konsole) return terminalIdFromEnv({ KONSOLE_VERSION: konsole })
  const vte = await $.env.get('VTE_VERSION')
  if (vte) return terminalIdFromEnv({ VTE_VERSION: vte })
  const kitty = await $.env.get('KITTY_WINDOW_ID')
  if (kitty) return terminalIdFromEnv({ KITTY_WINDOW_ID: kitty })
  const alacrittyWindow = await $.env.get('ALACRITTY_WINDOW_ID')
  if (alacrittyWindow) return terminalIdFromEnv({ ALACRITTY_WINDOW_ID: alacrittyWindow })
  const alacrittySocket = await $.env.get('ALACRITTY_SOCKET')
  if (alacrittySocket) return terminalIdFromEnv({ ALACRITTY_SOCKET: alacrittySocket })
  const os = await $.env.get('OS')

  return terminalIdFromEnv({ OS: os })
}

// This terminal's Arabic mode, resolved once per terminal per session as in
// thikr and salah; the Arabic picker refreshes the atom on a choice.
const arabicModeOf = async ($: EngineInterface, surface: string, cache: { current: { terminalId: string; mode: ArabicMode } | null }): Promise<ArabicMode> => {
  if (surface !== 'terminal') return 'plain'
  const id = await terminalId($)
  const selected = await read($, cachedArabicMode)
  let cached = selected?.terminalId === id ? selected : cache.current
  if (cached?.terminalId !== id) {
    const saved = await $.store.get('arabicTerminals') as Record<string, unknown> | undefined
    const storedMode = saved?.[id]
    const mode = isArabicMode(storedMode) ? storedMode : defaultArabicMode(id)
    cached = { terminalId: id, mode }
    cache.current = cached
  }

  return cached.mode
}

// One card above the prompt on the desktop at a time: while salah's athan card
// shows, it takes the band's place, and the band comes back when it closes.
const athanCard = atom({ plugin: 'muslim', key: 'salahCard' } as const, null as SalahCard | null)

// On reload, wait for salah's first tick before replacing a saved prayer slot.
let hasPrayerTimes = false
// The reminder settings: which sets open above the prompt by themselves.
let reminders = { morning: true, evening: true, afterSalah: true }

const dayRef = atom({ plugin: 'muslim', key: 'athkar' } as const, null as Day | null)

// Kept across sessions; today's reading for all three sets.
const STORE_KEY = 'athkar'

let dayQueue: Promise<unknown> = Promise.resolve()
const queueDay = <T,>(run: () => Promise<T>): Promise<T> => {
  const task = dayQueue.then(run)
  dayQueue = task.catch(() => undefined)
  return task
}

const STYLES: readonly Style[] = ['sky', 'frame']


// How long the progress glow slides to a new value.
const GLOW_MS = 700
// The finale when a set is finished: the band stands this tall while stars
// fall and the dua rises, then settles to the done row.
const FINALE_MS = 3200

// Where the glow stands some time into a slide, on the slide's ease-out curve.
const glowAtTime = (from: number, to: number, ms: number) => {
  const t = Math.min(1, Math.max(0, ms / GLOW_MS))

  return from + (to - from) * (1 - (1 - t) ** 3)
}

const isStyle = (value: string): value is Style => (STYLES as readonly string[]).includes(value)
const REMINDER_FIELDS = { morning: 'athkarMorning', evening: 'athkarEvening', afterSalah: 'athkarAfterSalah' } as const satisfies Record<AthkarSet, keyof Options>
const setLabel = (set: AthkarSet) => set === 'afterSalah' ? 'Athkar after salah' : `${set} athkar`

// Manual choices hold; otherwise offer after-salah after the card, then the
// automatic period. After-salah finished just now stays for its celebration.
const periodOf = (now: Date, day: Day, last: SalahLast | null, requested?: SalahLast | null, bounds?: SalahAthkarTimes | null): AthkarSet => {
  if (view.finished && !holdsFinished(view.finished, day.afterSalah, now.getTime(), view.isActive)) view.finished = undefined
  return setAt(now, day, last, view.chosen ?? (view.finished ? 'afterSalah' : undefined), requested, bounds, reminders.afterSalah)
}

// Holds an after-salah slot finished in front of the person on the band.
const holdIfFinished = (period: AthkarSet, before: Reading, after: Reading, now: Date) => {
  if (period === 'afterSalah' && !before.isDone && after.isDone) view.finished = { pray: after.pray ?? null, at: after.at ?? null, until: now.getTime() + FINALE_MS }
}

let resetUndo: ResetSnapshot | undefined
let undoTimer: { cancel: () => void } | undefined
const dropUndo = () => { resetUndo = undefined; undoTimer?.cancel(); undoTimer = undefined }

const localNow = async ($: EngineInterface) => new Date(await $.clock.now())

// Today's reading as held this session, else as stored, or a fresh day once
// the day has turned.
const today = async ($: EngineInterface, persist = true) => {
  const now = await localNow($)
  const { value } = await $.state.get({ plugin: 'muslim', key: 'athkar' })

  const bounds = hasPrayerTimes ? athkarTimesAt(now.getTime()) : null
  const stored = readDay(value ?? (await $.store.get(STORE_KEY)), dayOf(now, bounds))
  const signal = (await $.state.get({ plugin: 'muslim', key: 'salahLast' })).value
  const last = hasPrayerTimes ? signal ?? null : null
  const day = signal === undefined && hasPrayerTimes ? stored : syncAfterSalah(stored, last)
  if (day !== stored) {
    if (view.chosen === 'afterSalah') view.chosen = undefined
    if (persist) await save($, day)
  }
  const requested = (await $.state.get({ plugin: 'muslim', key: 'salahAfterSalahStart' })).value
  if (resetUndo && !canUndoReset(resetUndo, day, periodOf(now, day, last, requested, bounds), now.getTime())) dropUndo()
  return { now, day, last, requested, bounds }
}

const save = async ($: EngineInterface, day: Day) => {
  await $.state.set({ plugin: 'muslim', key: 'athkar' }, day)
  await $.store.set(STORE_KEY, day)
}

const statusOf = (day: Day, period: AthkarSet) => {
  const reading = day[period]
  const list = listFor(period, reading)
  if (reading.isDone) return 'done ✓'
  const begun = list.filter(thikr => countOf(thikr, reading) > 0).length

  return `${begun === 0 ? 'not started' : `${reading.index + 1} of ${list.length}`}${reading.isHidden ? ' (hidden)' : ''}`
}

// What the Muslim pane shows of today's reading, in the period now.
const panelAthkar = async ($: EngineInterface, tashkeel: boolean): Promise<PanelAthkar> => {
  const { now, day, last, requested, bounds } = await today($, false)
  const period = periodOf(now, day, last, requested, bounds)
  const reading = day[period]
  const list = listFor(period, reading)

  return {
    set: period === 'afterSalah' ? 'after-salah' : period,
    canUndo: canUndoReset(resetUndo, day, period, now.getTime()),
    title: withTashkeel(TITLE[period], tashkeel),
    done: list.filter(thikr => countOf(thikr, reading) >= timesOf(thikr)).length,
    total: list.length,
    progress: overall(period, reading),
    isDone: reading.isDone,
  }
}

// The Muslim pane's Open: the reader comes back if hidden and opens, lit.
const openFromPanel = async ($: EngineInterface) => {
  const { now, day, last, requested, bounds } = await today($)
  const period = periodOf(now, day, last, requested, bounds)
  if (view.chosen !== period) view.question = undefined
  view.chosen = period
  if (day[period].isHidden) await save($, { ...day, [period]: { ...day[period], isHidden: false } })
  view.isOpen = true
  wake($)
}

// Finish from the pane targets the set shown, including a manual choice.
const finishFromPanel = async ($: EngineInterface) => {
  const { now, day, last, requested, bounds } = await today($)
  const period = periodOf(now, day, last, requested, bounds)
  const after = step(period, day[period], { act: 'finish' })
  await save($, { ...day, [period]: after })
  holdIfFinished(period, day[period], after, now)
  if (periodOf(now, day, last, requested, bounds) === period) view.question = undefined
  $.ui.invalidate('ui.render')
}

// Shared by slash commands and pane picks: same hold, cover and unhide rules.
const chooseSet = async ($: EngineInterface, selected: AthkarSet) => {
  dropUndo()
  const { day } = await today($)
  const reading = day[selected]
  if (view.chosen !== selected) { view.isOpen = false; view.question = undefined; view.revision++ }
  view.chosen = selected
  view.finished = undefined
  if (reading.isHidden) await save($, { ...day, [selected]: { ...reading, isHidden: false } })
  wake($)
  return reading
}

const resetSet = async ($: EngineInterface, selected: AthkarSet, undoable = false) => {
  dropUndo()
  const { day, now } = await today($)
  if (undoable) {
    resetUndo = resetSnapshot(day, selected, now.getTime())
    undoTimer = $.clock.after(UNDO_MS, () => { dropUndo(); $.ui.invalidate('ui.render') })
  }
  await save($, resetReading(day, selected))
  view.chosen = selected
  view.isOpen = false
  view.question = undefined
  view.revision++
  rest($)
  $.ui.invalidate('ui.render')
}
const resetFromPanel = async ($: EngineInterface) => {
  const { now, day, last, requested, bounds } = await today($)
  await resetSet($, periodOf(now, day, last, requested, bounds), true)
}
const undoFromPanel = async ($: EngineInterface) => {
  const { now, day, last, requested, bounds } = await today($)
  const restored = undoReset(resetUndo, day, periodOf(now, day, last, requested, bounds), now.getTime())
  dropUndo()
  if (restored !== day) {
    view.question = undefined
    view.revision++
    await save($, restored)
  }
  $.ui.invalidate('ui.render')
}

const connectPanel = ($: EngineInterface, options: Options) => {
  connectAthkar(() => panelAthkar($, options.tashkeel))
  connectPanelAction('athkar-open', () => queueDay(() => openFromPanel($)))
  connectPanelAction('athkar-finish', () => queueDay(() => finishFromPanel($)))
  connectPanelAction('athkar-set', value => queueDay(async () => {
    const selected = setNamed(value)
    if (!selected) throw new Error('Unknown athkar set')
    await chooseSet($, selected)
  }))
  connectPanelAction('athkar-reset', () => queueDay(() => resetFromPanel($)))
  connectPanelAction('athkar-undo', () => queueDay(() => undoFromPanel($)))
}

// Moves on after a thikr's last count, unless the reader moved meanwhile.
const advance = async ($: EngineInterface, period: AthkarSet, index: number, revision: number, at?: number | null) => {
  if (view.revision !== revision || view.question || await setupShowing($, hasPrayerTimes, await $.session.surface() ?? 'desktop')) return
  const { day } = await today($)
  const reading = day[period]
  const thikr = currentOf(period, reading)
  if ((period === 'afterSalah' && reading.at !== at) || reading.index !== index || reading.isDone || countOf(thikr, reading) < timesOf(thikr)) return
  await apply($, { act: 'next' }, period)
}

// One step of today's reading, saved; after a count that ends a thikr, the
// next one shows by itself.
const apply = async ($: EngineInterface, act: Act, target?: AthkarSet) => {
  const { now, day, last, requested, bounds } = await today($)
  const period = target ?? periodOf(now, day, last, requested, bounds)
  const before = day[period]
  view.revision++
  if (asksToFinish(period, before, act)) {
    view.question = { day: day.day, period, focus: 'finish', blockedKey: view.lastKey }
    view.isOpen = true
    wake($)
    return
  }
  view.question = undefined
  const after = step(period, before, act)
  await save($, { ...day, [period]: after })
  holdIfFinished(period, before, after, now)
  if (act.act === 'hide') { view.chosen = undefined; view.finished = undefined }
  if (act.act === 'count' && shouldAdvance(period, before, after)) {
    const revision = view.revision
    $.clock.after(ADVANCE_MS, () => void queueDay(() => advance($, period, after.index, revision, after.at)))
  }
}

// Where the picture's controls sit, in CSS pixels as the band lays them out:
// the × at the top left (the folded row's is its whole height). A press
// anywhere else counts or opens the band.
type Hit = { x0: number; x1: number; y0: number; y1: number; act: Act }

export const hitsFor = (m: Pick<BandModel, 'phase' | 'isActive' | 'restHeight' | 'finaleMs'> & { width?: number }): Hit[] => [
  { ...closeArea(m), act: { act: 'hide' } },
  ...(m.phase === 'question' && m.isActive ? questionAreas(m.width ?? 0).map(a => ({ ...a, act: { act: a.act } })) : []),
]

// This session's view: past the cover, lit, and when it fades.
const arabicCache: { current: { terminalId: string; mode: ArabicMode } | null } = { current: null }

const view = {
  question: undefined as FinishQuestion | undefined,
  revision: 0,
  lastKey: undefined as string | undefined,
  isOpen: false,
  isActive: false,
  idle: undefined as { cancel: () => void } | undefined,
  // Set while the pointer is off the band: it fades unless it comes back.
  leave: undefined as { cancel: () => void } | undefined,
  // The pointer is over the band.
  isInside: false,
  pressedAt: 0,
  // Picked by a set command: holds for this session until the
  // other period is picked or the band is hidden with ×.
  chosen: undefined as AthkarSet | undefined,
  // After-salah finished just now: it keeps the band for the finale and the
  // done row, as morning and evening do, until the band rests.
  finished: undefined as FinishedHold | undefined,
}

// Lights the band, and fades it again after a while with no input.
const light = ($: EngineInterface) => {
  view.isActive = true
  view.idle?.cancel()
  view.idle = $.clock.after(IDLE_MS, () => {
    view.isActive = false
    $.ui.invalidate('ui.render')
  })
}

const wake = ($: EngineInterface) => {
  light($)
  $.ui.invalidate('ui.render')
}

// Fades the band, as at rest: the person has moved on from it.
const rest = ($: EngineInterface) => {
  view.leave?.cancel()
  if (!view.isActive) return
  view.isActive = false
  view.idle?.cancel()
  $.ui.invalidate('ui.render')
}

const setupShowing = async ($: EngineInterface, hasPlace: boolean, surface: string, hasSurvey = false) => {
  if (hasSurvey) return 'survey'
  const terminal = surface === 'terminal' ? {
    id: await terminalId($),
    manual: (await $.state.get({ plugin: 'muslim', key: 'arabicSurveyManualTerminal' })).value,
    saved: await $.store.get('arabicTerminals') as Record<string, unknown> | undefined,
  } : undefined
  return setupForm({ surface, hasSurvey, hasPlace,
    hasReview: !!(await $.state.get({ plugin: 'muslim', key: 'salahReview' })).value,
    later: (await $.state.get({ plugin: 'muslim', key: 'salahSetupLater' })).value === true
      || (await $.store.get(SETUP_LATER_KEY).catch(() => undefined)) === true,
    terminal,
  })
}

export const install = (on: On, options: Options) => {
  hasPrayerTimes = !!options.salahPlace
  reminders = { morning: options.athkarMorning, evening: options.athkarEvening, afterSalah: options.athkarAfterSalah }
  let shownSlot: { key: string; period: AthkarSet } | undefined
  let openedRequest: number | undefined
  let startsAt: number | null = null
  let startTimer: { cancel: () => void } | undefined
  let expiresAt: number | null = null
  let expiryTimer: { cancel: () => void } | undefined
  let periodDeadline: number | undefined
  let periodTimer: { cancel: () => void } | undefined
  // Historical bounds only change with the answer or a settings/module reload.
  let answerPeriod: { from: number; bounds: SalahAthkarTimes | null } | undefined
  // Refresh the prayer-based or fixed-hour sky, including clock/time-zone changes.
  let clock: { cancel: () => void } | undefined
  // The glow eases from where it last stood.
  let glowAt = -1
  let glowFrom = 0
  // When the glow last moved: every redraw is a new picture, so it slides only just after.
  let glowSince = 0
  let isStatusCleared = false
  // The phase last drawn, and when the set was finished in front of the person.
  let lastPhase: string | undefined
  let finishedAt = 0
  // The picture last drawn and the reader's region over it, for its clicks.
  let lastBand: BandModel | undefined
  let region = { columns: 0, rows: 0 }
  view.isOpen = false
  view.isActive = false
  view.isInside = false
  view.chosen = undefined
  view.finished = undefined
  view.question = undefined
  view.revision++
  view.lastKey = undefined
  dropUndo()

  on('command.run', { command: 'athkar' }, ($, e) => queueDay(async () => {
    const [word = '', value = ''] = e.args.trim().split(/\s+/)
    const selected = setNamed(word)
    const set = async (field: string, to: boolean | string, said: string) => {
      const key = `muslim.${field}`
      try {
        if (!hasConfigRow(await $.config.list(), key)) return { text: MISSING_CONFIG }
        await stopBeforeReload()
        const { deny } = await $.config.set({ key, value: to })
        return { text: deny ? configFailure(deny) : said }
      } catch (error) { return { text: configFailure(error) } }
    }

    // DEMO BEGIN: command entry; playback only, no input handling.
    if (word === 'demo') {
      if (value !== '' && !isStyle(value)) return { text: athkarHelp() }
      const isTerminal = await $.session.surface() === 'terminal'
      if (value === 'sky' && isTerminal) return { text: 'Sky is desktop only. Use `/athkar demo frame`.' }
      const style = value === '' ? (isTerminal ? 'frame' : options.athkarStyle) : value as Style

      return { text: await playDemo($, style, options.color) }
    }
    // DEMO END
    if (word === '') {
      const { now, day, last, requested, bounds } = await today($)
      const period = periodOf(now, day, last, requested, bounds)
      await chooseSet($, period)
      // chooseSet has just unhidden this period; the table shows it as saved.
      const shown: Day = { ...day, [period]: { ...day[period], isHidden: false } }

      return {
        text: [
          '**Muslim › Athkar**',
          helpHint('/athkar'),
          '',
          statusTable([
            ['Reminders', 'Morning · evening · after salah open by themselves', [options.athkarMorning, options.athkarEvening, options.athkarAfterSalah].map(isOn => isOn ? 'on' : 'off').join(' · ')],
            ['Style', 'The look; sky is desktop only', await $.session.surface() === 'terminal' ? 'frame (terminal)' : options.athkarStyle],
            ['Periods', 'Morning / evening', hasPrayerTimes ? 'Fajr / Maghrib' : '05:00 / 17:00'],
            ['Morning', 'Today\'s morning athkar', statusOf(shown, 'morning')],
            ['Evening', 'Today\'s evening athkar', statusOf(shown, 'evening')],
            ['Athkar after salah', 'The current prayer or general reading', statusOf(shown, 'afterSalah')],
          ]),
        ].join('\n'),
      }
    }
    if (word === 'help') return { text: athkarHelp() }
    if (word === 'style' && await $.session.surface() === 'terminal') return { text: 'The terminal always shows the frame; sky is desktop only. Change the style from the desktop app.' }
    if (word === 'style' && isStyle(value)) return set('athkarStyle', value, `style ${value}`)
    if (word === 'color') return { text: 'Color is now /muslim color.' }
    if (selected && (value === 'on' || value === 'off')) {
      return set(REMINDER_FIELDS[selected], value === 'on', `${setLabel(selected)} reminder ${value}`)
    }
    if (selected && value === 'reset') {
      await resetSet($, selected)

      return { text: `${setLabel(selected)} start again from the first` }
    }
    if (selected && value === '') {
      const reading = await chooseSet($, selected)

      return { text: reading.isDone ? `${setLabel(selected)} are done today: ${resetHint(selected)}` : `${setLabel(selected)} open above the prompt` }
    }

    return { text: athkarHelp() }
  }))

  // DEMO BEGIN: a separate drawing path.
  on('command.run', { command: 'muslim', args: /^\s*demo\s*$/ }, ($, e, next) => {
    connectAfterSalahDemo($, options)
    connectDemo('athkar', async () => playDemo($, await $.session.surface() === 'terminal' ? 'frame' : options.athkarStyle, options.color, true))
    return next(e)
  })

  on('command.run', { command: 'salah', args: /^\s*demo(?:\s|$)/ }, ($, e, next) => {
    connectAfterSalahDemo($, options)
    return next(e)
  })

  // The surface matcher distinguishes this registration from the real band.
  on('ui.render', { component: 'AbovePrompt', surface: ['desktop', 'terminal'] }, async ($, e, next) => {
    const theirs = await next(e)
    const playing = demo
    if (!playing || await setupShowing($, !!options.salahPlace, e.surface, e.props.hasSurvey) || (playing.style === 'sky' && e.surface !== 'desktop')) return theirs
    const now = await $.clock.now()
    const bounds = playing.set === 'afterSalah' && hasPrayerTimes
      ? athkarTimesAt(now) : null
    const scene = demoStep(playing.style, playing.accent, now - playing.startedAt, FINALE_MS, playing.set, skyOn(new Date(now), bounds))
    if (!scene) return theirs
    const isPicture = e.surface === 'desktop'
    if (isPicture && playing.set !== 'afterSalah') {
      const athan = await read($, athanCard)
      if (athan && athan.until > now) return theirs
    }
    const theme = (await $.config.list().catch(() => [])).find(row => row.key === 'theme')
    const isDark = isDarkTheme(theme?.value)
    const look = lookFor(scene.style, scene.accent, scene.sky, isDark, isPicture)
    const arabicMode = await arabicModeOf($, e.surface, demoArabicCache)
    const show = (text: string) => terminalArabic(e.surface, arabicMode, withTashkeel(text, options.tashkeel))
    const props = readerProps(scene.period, scene.reading, look, show, { isOpen: true, isActive: scene.isActive, isPicture })
    const thikr = currentOf(scene.period, scene.reading)
    if (thikr.note) props.note = show(thikr.note)
    const { Box, Client } = $.ui.resolve(e)
    if (!isPicture) {
      return (
        <Box flexDirection="column">
          <Box key="athkar-demo-band" width="100%">
            <Client key="athkar-demo" module="./reader.tsx" props={props} flexGrow={1} />
          </Box>
          {theirs}
        </Box>
      )
    }
    const width = Math.round(e.props.bodyColumns * CELL_PX)
    const model: BandModel = {
      phase: props.phase, period: scene.period, sky: scene.sky, style: scene.style,
      accent: scene.accent, isDark, isActive: scene.isActive, hasBegun: props.hasBegun,
      title: props.title, thikrId: thikr.id, text: props.text, note: props.note, position: props.position,
      count: countOf(thikr, scene.reading), times: timesOf(thikr),
      progress: scene.progress * 100, from: scene.from * 100, glowMs: scene.glowMs,
      finaleMs: scene.finaleMs, end: props.end, endHint: props.endHint, endNote: props.endNote,
      now, width, height: 0, restHeight: REST_PX, card: { ch: CELL_PX, lh: LINE_PX },
    }
    model.height = bandHeight(model, width)

    return (
      <Box flexDirection="column">
        <Box key="athkar-demo-band" marginX={-1} marginY={-1}>
          <Client key="athkar-demo" module="./card.tsx" props={plain(model)} width="100%" />
        </Box>
        {theirs ?? <Box key="athkar-demo-end" height={0} />}
      </Box>
    )
  })

  // DEMO END

  on('ui.render', { component: 'Pane', requestId: 'muslim' }, ($, e, next) => { connectPanel($, options); return next(e) })
  on('ui.message', { element: 'muslim-pane' }, ($, e, next) => { connectPanel($, options); return next(e) })

  on('state.set', { plugin: 'muslim', key: 'salahAfterSalahStart' }, async ($, e, next) => {
    const result = await next(e)
    if (!result.value?.isSet || !e.value) return result
    const signal = e.value
    await queueDay(async () => {
      const { day, last } = await today($)
      if (!last || last.at !== signal.at || last.pray !== signal.pray) return result
      // This explicit start resumes an unfinished reading, or restarts a finished one.
      const reading = day.afterSalah
      await save($, { ...day, afterSalah: { ...reading, ...(reading.isDone ? emptyReading() : {}), isHidden: false } })
      dropUndo()
      view.chosen = undefined
      view.pressedAt = Date.now()
      openedRequest = undefined // The next picture opens after its slot transition.
      wake($)
    })
    return result
  })

  on('ui.message', { element: 'athkar' }, ($, e) => queueDay(async () => {
    const m = e.data
    // Terminal native choice buttons use the same finish/resume operations.
    if (m && typeof m === 'object' && 'act' in m && (m.act === 'finish' || m.act === 'resume')) {
      const { now, day, last, requested, bounds } = await today($)
      if (view.question?.day === day.day && view.question.period === periodOf(now, day, last, requested, bounds) && view.isActive) {
        await apply($, { act: m.act })
        wake($)
      }
      return {}
    }
    if (!isCardMessage(m)) return {}
    if (m.act === 'size') {
      region = { columns: m.columns, rows: m.rows }

      return {}
    }
    // The engine says nothing of a click elsewhere: the pointer leaving the
    // band, or typing in the prompt, is the person moving on.
    if (m.act === 'enter') {
      view.isInside = true
      view.leave?.cancel()

      return {}
    }
    if (m.act === 'leave') {
      view.isInside = false
      view.leave?.cancel()
      if (view.isActive) view.leave = $.clock.after(LEAVE_MS, () => rest($))

      return {}
    }
    if (m.act === 'hide') {
      await apply($, m)

      return {}
    }
    // A click on the picture's × does that. The region is the
    // picture, in whole cells; its last row may be cut short.
    const columns = m.act === 'pointer' ? (m.columns ?? region.columns) : 0
    const rows = m.act === 'pointer' ? (m.rows ?? region.rows) : 0
    if (m.act === 'pointer') {
      view.pressedAt = Date.now()
      view.isInside = true
    }
    // Keys with the pointer elsewhere: it fades a while after the last one,
    // as the engine says nothing of a click elsewhere or of Escape.
    if (m.act === 'key' && !view.isInside) {
      view.leave?.cancel()
      view.leave = $.clock.after(KEY_REST_MS, () => rest($))
    }
    const { now, day, last, requested, bounds } = await today($)
    const period = periodOf(now, day, last, requested, bounds)
    const reading = day[period]
    if (view.question && (view.question.day !== day.day || view.question.period !== period || reading.isDone)) view.question = undefined
    if (m.act === 'pointer') view.lastKey = undefined
    if (m.act === 'pointer' && m.button === 'left' && lastBand && columns > 0 && rows > 0) {
      // The × sits at the left, so a click is placed from the left edge.
      const { px, py } = pixelOf(lastBand, m.x, m.y, columns, rows)
      const hit = hitsFor(lastBand).find(h => px >= h.x0 && px <= h.x1 && py >= h.y0 && py <= h.y1)
      if (hit) {
        if ((hit.act.act === 'finish' || hit.act.act === 'resume') && (!view.question || !view.isActive)) return {}
        if (hit.act.act === 'hide') view.isOpen = false
        await apply($, hit.act)

        return {}
      }
    }
    const isBack = m.act === 'pointer' ? m.button === 'right' : m.key === 'backspace'
    const isCount = m.act === 'pointer' ? m.button === 'left' : m.key === ' ' || m.key === 'space' || m.key === 'return'
    if (reading.isDone) {
      // A press on the folded done row only opens it.
      if (!view.isActive) {
        if (isCount) wake($)

        return {}
      }
      wake($)
      if (isBack) await apply($, { act: 'back' })

      return {}
    }
    // The first click wakes the band, folded cover or reading; it never counts.
    if (!view.isActive) {
      if (!isCount) return {}
      wake($)

      return {}
    }
    // The next one on the open cover starts the reading; it does not count either.
    if (!view.isOpen) {
      if (!isCount) return {}
      view.isOpen = true
      wake($)

      return {}
    }
    wake($)
    if (view.question) {
      if (m.act === 'pointer' && isBack) {
        view.question = undefined
        view.revision++
      } else if (m.act === 'key') {
        const result = questionKey(view.question, m.key)
        view.question = result.question
        if (result.act) await apply($, result.act)
      }
      $.ui.invalidate('ui.render')
      return {}
    }
    if (m.act === 'key') view.lastKey = countKey(m.key)
    if (isCount) await apply($, { act: 'count' })
    else if (isBack) await apply($, { act: 'back' })
    else if (m.act === 'key' && m.key === 'left') await apply($, { act: 'next' })
    else if (m.act === 'key' && m.key === 'right') await apply($, { act: 'previous' })

    return {}
  }))

  // A click elsewhere takes the focus off the band: it fades, as at rest.
  on('ui.focus', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.plugin !== 'muslim' && Date.now() - view.pressedAt > FOCUS_GRACE_MS) rest($)

    return next(e)
  })

  on('prompt.edit', async ($, e, next) => {
    rest($)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    connectPanel($, options)
    if (demo && (demo.style === 'frame' || e.surface === 'desktop')) return theirs
    // An earlier build left a debugging line in the status bar: clear it once.
    if (!isStatusCleared) {
      isStatusCleared = true
      $.ui.status(undefined)
    }
    if ((e.surface !== 'terminal' && e.surface !== 'desktop') || await setupShowing($, !!options.salahPlace, e.surface, e.props.hasSurvey)) return theirs
    // Read while drawing so a save draws the band again; before the first
    // save this session, the stored day.
    const held = (await read($, dayRef)) ?? (await $.store.get(STORE_KEY))
    clock ??= $.clock.every(60_000, () => $.ui.invalidate('ui.render'))
    const now = await localNow($)
    const signal = (await $.state.get({ plugin: 'muslim', key: 'salahLast' })).value
    const last = hasPrayerTimes ? signal ?? null : null
    const requested = (await $.state.get({ plugin: 'muslim', key: 'salahAfterSalahStart' })).value
    const deadline = last ? offerStart(last, requested) : null
    if (startsAt !== deadline) {
      startTimer?.cancel()
      startsAt = deadline
      if (deadline !== null && deadline > now.getTime()) {
        startTimer = $.clock.after(deadline - now.getTime(), () => $.ui.invalidate('ui.render'))
      }
    }
    const expiry = last ? offerEnd(last) : null
    if (expiresAt !== expiry) {
      expiryTimer?.cancel()
      expiresAt = expiry
      if (expiry !== null && expiry > now.getTime()) {
        expiryTimer = $.clock.after(expiry - now.getTime(), () => $.ui.invalidate('ui.render'))
      }
    }
    const bounds = hasPrayerTimes ? athkarTimesAt(now.getTime()) : null
    const boundary = nextPeriodAt(now, bounds)
    if (boundary !== periodDeadline) {
      periodTimer?.cancel()
      periodDeadline = boundary
      if (boundary !== undefined) periodTimer = $.clock.after(boundary - now.getTime(), () => $.ui.invalidate('ui.render'))
    }
    const stored = readDay(held, dayOf(now, bounds))
    const day = signal === undefined && hasPrayerTimes ? stored : syncAfterSalah(stored, last)
    if (day !== stored) {
      if (view.chosen === 'afterSalah') view.chosen = undefined
      $.clock.after(0, () => void queueDay(() => today($)))
    }
    const period = periodOf(now, day, last, requested, bounds)
    const reading = day[period]
    const slotKey = `${day.day}:${period}:${period === 'afterSalah' ? day.afterSalah.at : ''}`
    if (shownSlot !== undefined && shownSlot.key !== slotKey && (shownSlot.period === 'afterSalah' || period === 'afterSalah')) {
      view.isOpen = false
      lastPhase = undefined
    }
    shownSlot = { key: slotKey, period }
    if (reading.isHidden) return theirs
    // Only automatic sets are quiet. Keep both period/offer timers armed above.
    const answered = (await $.state.get({ plugin: 'muslim', key: 'firstRunRemindFrom' })).value
    const from = readRemindFrom(answered ?? (await $.store.get(REMIND_FROM_KEY)))
    const later = (await $.state.get({ plugin: 'muslim', key: 'salahSetupLater' })).value === true
      || (await $.store.get(SETUP_LATER_KEY).catch(() => undefined)) === true
    const pending = setupPending(!!options.salahPlace, later, from)
    const isRequested = period === 'afterSalah' && !!last && requested?.at === last.at && requested.pray === last.pray
    if (from !== null && answerPeriod?.from !== from) answerPeriod = { from, bounds: hasPrayerTimes ? athkarTimesAt(from - 1) : null }
    const mayOpen = period === 'afterSalah'
      ? mayOpenByItself(pending, from, last?.at ?? null)
      : mayOpenPeriod(pending, from, now, answerPeriod?.bounds)
    // A reminder switched off keeps that set from opening by itself; a reading already begun stays.
    const isReminded = reminders[period] || hasBegun(reading)
    if (!view.chosen && !view.finished && !isRequested && (!mayOpen || !isReminded)) return theirs
    if (period === 'afterSalah' && last && requested?.at === last.at && requested.pray === last.pray
      && !reading.isDone && openedRequest !== last.at) {
      openedRequest = last.at
      view.isOpen = true
      light($)
    }

    // Light themes take the deeper main colors.
    const theme = (await $.config.list().catch(() => [])).find(row => row.key === 'theme')
    const isDark = isDarkTheme(theme?.value)
    const isPicture = e.surface === 'desktop'
    const sky = skyOn(now, bounds)
    // Sky is desktop only; the terminal always draws the frame.
    const look = lookFor(isPicture ? options.athkarStyle : 'frame', options.color, sky, isDark, isPicture)
    // The shared Arabic path: the tashkeel setting, then this terminal's mode.
    const arabicMode = await arabicModeOf($, e.surface, arabicCache)
    const show = (text: string) => terminalArabic(e.surface, arabicMode, withTashkeel(text, options.tashkeel))
    if (view.question && (view.question.day !== dayOf(now) || view.question.period !== period || reading.isDone)) view.question = undefined
    const props = readerProps(period, reading, look, show, { isOpen: view.isOpen, isActive: view.isActive, isPicture, question: view.question })
    // Finished just now, not found finished on a reload: the finale plays once.
    if (props.phase === 'done' && lastPhase !== undefined && lastPhase !== 'done') {
      finishedAt = Date.now()
      $.clock.after(FINALE_MS, () => $.ui.invalidate('ui.render'))
    }
    lastPhase = props.phase
    const finaleMs = props.phase === 'done' && Date.now() - finishedAt < FINALE_MS ? Date.now() - finishedAt : undefined
    const { Box, Client } = $.ui.resolve(e)

    if (e.surface !== 'desktop') {
      lastBand = undefined
      return (
        <Box flexDirection="column">
          <Box key="athkar-band" width="100%">
            <Client key="athkar" module="./reader.tsx" props={props} flexGrow={1} />
          </Box>
          {theirs}
        </Box>
      )
    }

    // One card at a time: while the athan card shows, it takes the band's place.
    const athan = await read($, athanCard)
    if (athan && athan.until > now.getTime()) return theirs

    const thikr = currentOf(period, reading)
    const progress = Math.round(overall(period, reading) * 1000) / 10
    // A new value slides on from where the glow stands now, mid-slide or not,
    // so quick counts never make it jump back.
    if (progress !== glowAt) {
      glowFrom = glowAt < 0 ? progress : glowAtTime(glowFrom, glowAt, Date.now() - glowSince)
      glowAt = progress
      glowSince = Date.now()
    }
    const glowMs = Date.now() - glowSince
    const times = timesOf(thikr)
    const width = Math.round(e.props.bodyColumns * CELL_PX)
    const model: BandModel = {
      phase: props.phase,
      question: props.question,
      period,
      sky,
      style: options.athkarStyle,
      finaleMs,
      accent: options.color,
      isDark,
      isActive: view.isActive,
      hasBegun: props.hasBegun,
      title: show(TITLE[period]),
      thikrId: thikr.id,
      text: show(textOf(thikr, period)),
      note: props.note,
      position: props.position,
      count: Math.min(countOf(thikr, reading), times),
      times,
      progress,
      from: glowMs < GLOW_MS ? glowFrom : progress,
      glowMs: glowMs < GLOW_MS ? glowMs : 0,
      end: show(END),
      endHint: props.endHint,
      endNote: props.endNote,
      now: now.getTime(),
      width,
      height: 0,
      restHeight: REST_PX,
      card: { ch: CELL_PX, lh: LINE_PX },
    }
    // The finale stands as tall as the desktop lets the band be.
    // One open height for reading, finale and done.
    model.height = bandHeight(model, width)
    lastBand = model

    return (
      // The desktop's card pads the band, and its scroller is the card's whole
      // box: the picture reaches into that padding, a cell each side and half a
      // line above and below. The desktop drops vertical margins down a root's
      // line of only children, so the band always has a sibling.
      <Box flexDirection="column">
        <Box key="athkar-band" marginX={-1} marginY={-1}>
          <Client key="athkar" module="./card.tsx" props={plain(model)} width="100%" />
        </Box>
        {theirs ?? <Box key="athkar-end" height={0} />}
      </Box>
    )
  })
}

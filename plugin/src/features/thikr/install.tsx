import { MODES_KEY } from '../../shared/arabic/terminal.ts'
import { configFailure, hasConfigRow, MISSING_CONFIG } from '../../shared/reload/config.ts'
import { SETUP_LATER_KEY } from '../../shared/pray/first-run.ts'
import { setupForm } from '../../shared/setup/visibility.ts'
import { stopBeforeReload } from '../../shared/reload/signal.ts'
import { accentText, type Accent } from '../../shared/color/index.ts'
import { defaultArabicMode, isArabicMode, terminalArabic, terminalIdFromEnv, type ArabicMode } from '../../shared/arabic/terminal.ts'
import { atom, read } from 'claude-code'
import { helpHint, statusTable } from '../../table.ts'
import { thikrHelp } from './help.ts'
import type { EngineInterface, On } from 'claude-code'

import type { UsageLimit } from '../../../types'
import { readSpeed, SPEED_MAX, SPEED_MIN } from '../../config.ts'
import type { Mode, Options } from '../../config.ts'
import { limitUntil } from './limit.ts'
import type { RateLimitWindow } from './limit.ts'
import { SALAWAT, STARTING, USAGE_LIMIT } from './phrases.ts'
import { END_OF_TURN } from '../../shared/thikr/end.ts'
import { groupFor, isStepRow, phraseAt, pickStart, startOf, withThikr } from './rotation.ts'
import { withTashkeel } from '../../shared/arabic/visual.ts'
import type { Group, Speed } from './rotation.ts'

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

// Resolve once per terminal per session; the Arabic picker refreshes this atom on a choice.
const renderArabic = async ($: EngineInterface, surface: string, text: string, cache: { current: { terminalId: string; mode: ArabicMode } | null }): Promise<string> => {
  if (surface !== 'terminal') return terminalArabic(surface, 'plain', text)
  const id = await terminalId($)
  const selected = await read($, cachedArabicMode)
  let cached = selected?.terminalId === id ? selected : cache.current
  if (cached?.terminalId !== id) {
    const saved = await $.store.get(MODES_KEY) as Record<string, unknown> | undefined
    const storedMode = saved?.[id]
    const mode = isArabicMode(storedMode) ? storedMode : defaultArabicMode(id)
    cached = { terminalId: id, mode }
    cache.current = cached
  }

  return terminalArabic(surface, cached.mode, text)
}

const usageLimit = atom({ plugin: 'muslim', key: 'usageLimit' } as const, null as UsageLimit | null)

const setLimit = ($: EngineInterface, value: UsageLimit | null) =>
  $.state.set({ plugin: 'muslim', key: 'usageLimit' }, value)

let limitTimer: { cancel: () => void } | undefined
const armLimit = async ($: EngineInterface, until: number | null) => {
  limitTimer?.cancel()
  limitTimer = undefined
  const now = await $.clock.now()
  if (until === null || until <= now) return
  limitTimer = $.clock.after(until - now, async () => {
    try {
      if ((await read($, usageLimit))?.until === until) await setLimit($, null)
    } catch {}
  })
}

// A full usage window holds the limit's thikr until it resets.
const holdLimit = async ($: EngineInterface, windows: readonly RateLimitWindow[]) => {
  const until = limitUntil(windows)
  if (until === undefined) return
  await setLimit($, { until })
  await armLimit($, until)
}

const onOff = (value: boolean) => (value ? 'on' : 'off')

const isMode = (value: string): value is Mode => value === 'all' || value === 'salawat'

const speedText = (speed: Speed) => (speed === 'auto' ? 'auto' : `${speed}s`)

// Redraws often enough for auto speed and for a tool crossing the long mark.
const TICK_MS = 500

// DEMO BEGIN: imports and transient runner (module values only; no settings, store or saved state).
import { demoPrompt, demoReply, demoSceneAt, DEMO_LIMIT_MS, DEMO_SUBMIT_MS, DEMO_TICK_MS } from './demo.ts'
import { connectDemo, doneDemo, failDemo } from '../../shared/demo/signal.ts'

// armed: waits for the demo's own turn; playing: that turn; limit: the usage-limit line after it.
// shared: started by /muslim demo, which waits for this demo's end.
type DemoRun = { phase: 'armed' | 'playing' | 'limit'; startedAt: number; turnId?: string; shared?: boolean; timer?: { cancel: () => void } }

let demo: DemoRun | undefined
const demoArabicCache: { current: { terminalId: string; mode: ArabicMode } | null } = { current: null }

// Arms the demo and starts its own turn. The host refuses a submit made while the command
// still runs ("would wait on the turn this hook is holding"), so it goes from a timer just
// after the reply, and nothing waits for the turn. A submit that fails or is dropped
// disarms, so the demo never waits for a later message.
const armDemo = ($: EngineInterface, shared = false): string => {
  demo?.timer?.cancel()
  const armed: DemoRun = { phase: 'armed', startedAt: 0, shared }
  demo = armed
  const disarm = () => {
    if (demo === armed) {
      demo = undefined
      if (shared) failDemo()
    }
  }
  armed.timer = $.clock.after(DEMO_SUBMIT_MS, () => {
    $.prompt.submit({ text: demoPrompt(shared ? '/muslim demo' : '/thikr demo') }).then(result => result.drop === undefined || disarm(), disarm)
  })

  return demoReply()
}

const startDemo = async ($: EngineInterface, turnId: string) => {
  const startedAt = await $.clock.now()
  demo = { phase: 'playing', startedAt, turnId, shared: demo?.shared, timer: $.clock.every(DEMO_TICK_MS, () => $.ui.invalidate('ui.render')) }
}

// The turn ended: the usage-limit line holds for its seconds, then the demo disarms itself.
const holdDemoLimit = ($: EngineInterface) => {
  const playing = demo
  if (playing?.phase !== 'playing') return
  playing.timer?.cancel()
  const holding: DemoRun = { phase: 'limit', startedAt: playing.startedAt, shared: playing.shared }
  holding.timer = $.clock.after(DEMO_LIMIT_MS, () => {
    if (demo !== holding) return
    demo = undefined
    $.ui.invalidate('ui.render')
    if (holding.shared) doneDemo('thikr')
  })
  demo = holding
  $.ui.invalidate('ui.render')
}
// DEMO END

const setupShowing = async ($: EngineInterface, hasPlace: boolean, surface: string, hasSurvey = false) => {
  if (hasSurvey) return 'survey'
  const terminal = surface === 'terminal' ? {
    id: await terminalId($),
    manual: (await $.state.get({ plugin: 'muslim', key: 'arabicSurveyManualTerminal' })).value,
    saved: await $.store.get(MODES_KEY) as Record<string, unknown> | undefined,
  } : undefined
  return setupForm({ surface, hasSurvey, hasPlace,
    hasReview: !!(await $.state.get({ plugin: 'muslim', key: 'salahReview' })).value,
    later: (await $.state.get({ plugin: 'muslim', key: 'salahSetupLater' })).value === true
      || (await $.store.get(SETUP_LATER_KEY).catch(() => undefined)) === true,
    terminal,
  })
}

// Preflight and quiet failure mapping stay in this file; callers keep their reply/rollback.
const writeSetting = async ($: EngineInterface, key: string, value: boolean | number | string): Promise<string | undefined> => {
  try {
    if (!hasConfigRow(await $.config.list(), key)) return MISSING_CONFIG
    await stopBeforeReload()
    const { deny } = await $.config.set({ key, value })
    return deny ? configFailure(deny) : undefined
  } catch (error) { return configFailure(error) }
}

export const install = (on: On, options: Options) => {
  const arabicCache: { current: { terminalId: string; mode: ArabicMode } | null } = { current: null }
  let limitRestored = false
  // Spinner timing, per turn. Module values: a reload mid-turn only restarts the order.
  let group: Group | undefined
  let groupSince = 0
  // Time each group has played this turn, so a group resumes where it left off.
  const played = new Map<Group, number>()
  let hasMovedOn = false
  // Each turn opens on a random starting phrase, never the last turn's.
  let lastStart: number | undefined
  // Salawat mode: turns so far, so each turn takes the next salawat.
  let turns = 0
  let ticker: { cancel: () => void } | undefined
  // Long moments: compacting, subagents at work, tools by start time.
  let isCompacting = false
  let subagents = 0
  const toolsSince = new Map<string, number>()
  // The desktop's last tool step, whose row stays up after the tool ends.
  let lastStep: string | undefined

  on('command.run', { command: 'thikr' }, async ($, e) => {
    const [word = '', value = ''] = e.args.trim().split(/\s+/)
    const set = async (field: string, to: boolean | number | string, said: string) => ({ text: await writeSetting($, `muslim.${field}`, to) ?? said })
    const surface = await $.session.surface().catch(() => 'desktop' as const) ?? 'desktop'
    const help = await renderArabic($, surface, thikrHelp(), arabicCache)

    // DEMO BEGIN: command entry; arms and starts the demo's own turn.
    if (word === 'demo') return { text: armDemo($) }
    // DEMO END
    if (word === '') {
      return {
        text: [
          '**Muslim › Thikr**',
          helpHint('/thikr'),
          '',
          statusTable([
            ['Thikr', 'Tasbih in Claude\'s working line', onOff(options.thikr)],
            ['Speed', 'How long each phrase stays', speedText(options.thikrSpeed)],
            ['End', `${await renderArabic($, surface, END_OF_TURN, arabicCache)} at the end of a turn`, onOff(options.thikrEnd)],
            ['Mode', 'Which phrases play', options.thikrMode],
          ]),
        ].join('\n'),
      }
    }
    if (word === 'help') return { text: help }
    if (word === 'on' || word === 'off') return set('thikr', word === 'on', `thikr ${word}`)
    if (word === 'mode' && isMode(value)) return set('thikrMode', value, `mode ${value}`)
    if (word === 'end' && (value === 'on' || value === 'off')) return set('thikrEnd', value === 'on', `end ${value}`)
    if (word === 'speed') {
      const speed = readSpeed(value)
      if (value === 'auto' || speed !== 'auto') return set('thikrSpeed', String(speed), `speed ${speedText(speed)}`)

      return { text: `Speed is auto, or a whole number of seconds from ${SPEED_MIN} to ${SPEED_MAX}.` }
    }

    return { text: help }
  }).catch(() => ({ text: 'Could not complete the command. Try again.' }))

  // DEMO BEGIN: separate hooks, registered even with thikr off; they pass through unless a demo is armed.
  on('command.run', { command: 'muslim', args: /^\s*demo\s*$/ }, ($, e, next) => {
    connectDemo('thikr', () => armDemo($, true))
    return next(e)
  }).catch(() => ({ text: 'Could not complete the command. Try again.' }))

  // The matchers (every turn, every ending) only tell these apart from the feature's own hooks.
  on('turn.start', { turnId: /./ }, async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    if (demo?.phase === 'armed') await startDemo($, e.turnId)

    return next(e)
  })

  on('turn.complete', { reason: ['answer', 'aborted', 'refusal', 'error'] }, async ($, e, next) => {
    if (e.agentId === undefined && demo?.turnId === e.turnId) holdDemoLimit($)

    return next(e)
  })

  // Every phrase of every moment in order, fast, through the real Arabic and step-row code.
  on('ui.render', { component: 'Spinner', surface: ['desktop', 'terminal'] }, async ($, e, next) => {
    const playing = demo
    if (playing?.phase !== 'playing') return next(e)
    const { text } = demoSceneAt((await $.clock.now()) - playing.startedAt)
    const phrase = await renderArabic($, e.surface, withTashkeel(text, options.tashkeel), demoArabicCache)
    const shown = withThikr(e.props, phrase, isStepRow(e.surface, e.props, undefined))

    return next({ ...e, props: { ...e.props, ...shown, suffix: '' } })
  })

  // The end-of-turn word shows even with `thikrEnd` off.
  on('ui.render', { component: 'TurnDuration', surface: ['terminal'] }, async ($, e, next) => {
    if (!demo || demo.phase === 'armed') return next(e)

    return next({ ...e, props: { ...e.props, word: await renderArabic($, e.surface, withTashkeel(END_OF_TURN, options.tashkeel), demoArabicCache) } })
  })

  on('ui.render', { component: 'AbovePrompt', surface: ['desktop', 'terminal'] }, async ($, e, next) => {
    const theirs = await next(e)
    if (demo?.phase !== 'limit' || await setupShowing($, !!options.salahPlace, e.surface, e.props.hasSurvey)) return theirs
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Text key="usage-limit-demo" color={await mainColor($, options.color)}>{await renderArabic($, e.surface, withTashkeel(USAGE_LIMIT, options.tashkeel), demoArabicCache)}</Text>
        {theirs}
      </Box>
    )
  })
  // DEMO END

  if (!options.thikr) return

  on('turn.start', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    group = undefined
    lastStep = undefined
    played.clear()
    lastStart = pickStart(STARTING.length, lastStart, Math.random())
    played.set('starting', startOf('starting', lastStart, options.thikrSpeed))
    turns += 1
    hasMovedOn = false
    isCompacting = false
    subagents = 0
    toolsSince.clear()
    ticker?.cancel()
    ticker = options.thikrMode === 'salawat' ? undefined : $.clock.every(TICK_MS, () => $.ui.invalidate('ui.render'))
    limitTimer?.cancel()
    limitTimer = undefined
    await setLimit($, null)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    ticker?.cancel()
    ticker = undefined

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const isSubagent = e.tool === 'Agent'
    toolsSince.set(e.tool_use_id, await $.clock.now())
    if (isSubagent) subagents += 1
    try {
      return await next(e)
    } finally {
      toolsSince.delete(e.tool_use_id)
      if (isSubagent) subagents = Math.max(0, subagents - 1)
    }
  }).catch(($, e, next) => next(e))

  on('classic.PreCompact', async ($, e, next) => {
    isCompacting = true
    $.ui.invalidate('ui.render')

    return next(e)
  }).catch(($, e, next) => next(e))

  on('classic.PostCompact', async ($, e, next) => {
    isCompacting = false

    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (demo?.phase === 'playing') return next(e)
    const now = await $.clock.now()
    if (e.props.mode !== 'requesting') hasMovedOn = true
    const oldestTool = Math.min(now, ...toolsSince.values())
    const current = groupFor({
      mode: e.props.mode,
      hasMovedOn,
      isCompacting,
      hasSubagent: subagents > 0,
      toolRunMs: now - oldestTool,
    })
    if (current !== group) {
      if (group) played.set(group, now - groupSince)
      group = current
      groupSince = now - (played.get(current) ?? 0)
    }
    const text = options.thikrMode === 'salawat'
      ? SALAWAT[Math.max(0, turns - 1) % SALAWAT.length] ?? ''
      : phraseAt(current, now - groupSince, options.thikrSpeed)
    const phrase = await renderArabic($, e.surface, withTashkeel(text, options.tashkeel), arabicCache)

    const isStep = isStepRow(e.surface, e.props, lastStep, toolsSince.size > 0)
    if (isStep) lastStep = e.props.word

    const shown = withThikr(e.props, phrase, isStep)

    return next({ ...e, props: { ...e.props, ...shown, suffix: '' } })
  })

  if (options.thikrEnd) {
    on('ui.render', { component: 'TurnDuration' }, async ($, e, next) =>
      next({ ...e, props: { ...e.props, word: await renderArabic($, e.surface, withTashkeel(END_OF_TURN, options.tashkeel), arabicCache) } }),
    )
  }

  on('classic.StopFailure', async ($, e, next) => {
    if (e.error === 'rate_limit') await holdLimit($, (await $.session.usage()).rateLimits)

    return next(e)
  }).catch(($, e, next) => next(e))

  // A response that reports a full window shows it too, before any turn fails.
  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits') && e.rateLimits.some(window => window.percentUsed >= 100)) await holdLimit($, e.rateLimits)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    const limit = await read($, usageLimit)
    if (!limitRestored) {
      limitRestored = true
      if (limit) await armLimit($, limit.until)
    }
    if (!limit || (limit.until !== null && limit.until <= await $.clock.now()) || await setupShowing($, !!options.salahPlace, e.surface, e.props.hasSurvey)) return theirs
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Text key="usage-limit" color={await mainColor($, options.color)}>{await renderArabic($, e.surface, withTashkeel(USAGE_LIMIT, options.tashkeel), arabicCache)}</Text>
        {theirs}
      </Box>
    )
  })
}

// Engine access stays in this file; the shared palette is pure.
const mainColor = async ($: EngineInterface, color: Accent): Promise<string> => {
  if (color === 'orange') return accentText(color, undefined)
  const theme = (await $.config.list().catch(() => [])).find(row => row.key === 'theme')
  return accentText(color, theme?.value)
}

import { defaultArabicMode, isArabicMode, terminalArabic, terminalIdFromEnv, type ArabicMode } from '../../shared/arabic/terminal.ts'
import { atom, read } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'

import type { UsageLimit } from '../../../types'
import { readSpeed, SPEED_MAX, SPEED_MIN } from '../../config.ts'
import type { Mode, Options } from '../../config.ts'
import { limitUntil } from './limit.ts'
import { END_OF_TURN, SALAWAT, STARTING, USAGE_LIMIT } from './phrases.ts'
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
  if (surface !== 'terminal') return terminalArabic(surface, 'none', text)
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

  return terminalArabic(surface, cached.mode, text)
}

const usageLimit = atom({ plugin: 'muslim', key: 'usageLimit' } as const, null as UsageLimit | null)

const HELP = [
  '/thikr                    status',
  '/thikr on | off           show tasabih while Claude works',
  `/thikr speed auto          reading time: 1s + 0.5s per word`,
  `/thikr speed <${SPEED_MIN}-${SPEED_MAX}>       fixed seconds per phrase`,
  '/thikr end on | off       تَمَّ بِحَمْدِ اللَّهِ at the end of a turn',
  '/thikr mode all | salawat  every group, or one salawat for each whole turn',
].join('\n')

const setLimit = ($: EngineInterface, value: UsageLimit | null) =>
  $.state.set({ plugin: 'muslim', key: 'usageLimit' }, value)

const onOff = (value: boolean) => (value ? 'on' : 'off')

const isMode = (value: string): value is Mode => value === 'all' || value === 'salawat'

const speedText = (speed: Speed) => (speed === 'auto' ? 'auto' : `${speed}s`)

// Redraws often enough for auto speed and for a tool crossing the long mark.
const TICK_MS = 500

export const install = (on: On, options: Options) => {
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
    const set = async (field: string, to: boolean | number | string, said: string) => {
      const { deny } = await $.config.set({ key: `muslim.${field}`, value: to })

      return { text: deny ? `Not changed: ${deny}` : said }
    }

    if (word === '') {
      return {
        text: [
          `thikr ${onOff(options.thikr)} · speed ${speedText(options.thikrSpeed)} · end ${onOff(options.thikrEnd)} · mode ${options.thikrMode}`,
          '',
          HELP,
        ].join('\n'),
      }
    }
    if (word === 'on' || word === 'off') return set('thikr', word === 'on', `thikr ${word}`)
    if (word === 'mode' && isMode(value)) return set('thikrMode', value, `mode ${value}`)
    if (word === 'tashkeel') return { text: 'Tashkeel is plugin-wide now: /muslim tashkeel on | off' }
    if (word === 'end' && (value === 'on' || value === 'off')) return set('thikrEnd', value === 'on', `end ${value}`)
    if (word === 'speed') {
      const speed = readSpeed(value)
      if (value === 'auto' || speed !== 'auto') return set('thikrSpeed', String(speed), `speed ${speedText(speed)}`)

      return { text: `Speed is auto, or a whole number of seconds from ${SPEED_MIN} to ${SPEED_MAX}.` }
    }

    return { text: HELP }
  })

  if (!options.thikr) return

  const arabicCache: { current: { terminalId: string; mode: ArabicMode } | null } = { current: null }

  on('turn.start', async ($, e, next) => {
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
    await setLimit($, null)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
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
  })

  on('classic.PreCompact', async ($, e, next) => {
    isCompacting = true
    $.ui.invalidate('ui.render')

    return next(e)
  })

  on('classic.PostCompact', async ($, e, next) => {
    isCompacting = false

    return next(e)
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
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
    if (e.error === 'rate_limit') {
      const { rateLimits } = await $.session.usage()
      const until = limitUntil(rateLimits)
      if (until !== undefined) {
        await setLimit($, { until })
        if (until !== null) {
          const wait = Math.max(0, until - (await $.clock.now()))
          $.clock.after(wait, () => void setLimit($, null))
        }
      }
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    const limit = await read($, usageLimit)
    if (!limit || e.props.hasSurvey) return theirs
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Text key="usage-limit" color="claude">{await renderArabic($, e.surface, withTashkeel(USAGE_LIMIT, options.tashkeel), arabicCache)}</Text>
        {theirs}
      </Box>
    )
  })
}

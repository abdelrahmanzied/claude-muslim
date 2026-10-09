import { atom, read } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'

import type { UsageLimit } from '../../../types'
import { readSpeed, SPEED_MAX, SPEED_MIN } from '../../config.ts'
import type { Options } from '../../config.ts'
import { limitUntil } from './limit.ts'
import { END_OF_TURN, SALAWAT, STARTING, USAGE_LIMIT } from './phrases.ts'
import { display, groupFor, phraseAt, pickStart, startOf, withThikr } from './rotation.ts'
import type { Group, Speed } from './rotation.ts'

const usageLimit = atom({ plugin: 'muslim', key: 'usageLimit' } as const, null as UsageLimit | null)

const HELP = [
  '/thikr                    status',
  '/thikr on | off           show tasabih while Claude works',
  `/thikr speed auto          reading time: 1s + 0.5s per word`,
  `/thikr speed <${SPEED_MIN}-${SPEED_MAX}>       fixed seconds per phrase`,
  '/thikr tashkeel on | off  show diacritics',
  '/thikr end on | off       تَمَّ بِحَمْدِ اللَّهِ at the end of a turn',
  '/thikr salawat on | off   only اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ',
].join('\n')

const setLimit = ($: EngineInterface, value: UsageLimit | null) =>
  $.state.set({ plugin: 'muslim', key: 'usageLimit' }, value)

const onOff = (value: boolean) => (value ? 'on' : 'off')

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
  let ticker: { cancel: () => void } | undefined
  // Long moments: compacting, subagents at work, tools by start time.
  let isCompacting = false
  let subagents = 0
  const toolsSince = new Map<string, number>()

  on('command.run', { command: 'thikr' }, async ($, e) => {
    const [word = '', value = ''] = e.args.trim().split(/\s+/)
    const set = async (field: string, to: boolean | number | string, said: string) => {
      const { deny } = await $.config.set({ key: `muslim.${field}`, value: to })

      return { text: deny ? `Not changed: ${deny}` : said }
    }

    if (word === '') {
      return {
        text: [
          `thikr ${onOff(options.thikr)} · speed ${speedText(options.thikrSpeed)} · tashkeel ${onOff(options.thikrTashkeel)} · end ${onOff(options.thikrEnd)} · salawat ${onOff(options.thikrSalawat)}`,
          '',
          HELP,
        ].join('\n'),
      }
    }
    if (word === 'on' || word === 'off') return set('thikr', word === 'on', `thikr ${word}`)
    if ((word === 'tashkeel' || word === 'end' || word === 'salawat') && (value === 'on' || value === 'off')) {
      const field = word === 'tashkeel' ? 'thikrTashkeel' : word === 'end' ? 'thikrEnd' : 'thikrSalawat'

      return set(field, value === 'on', `${word} ${value}`)
    }
    if (word === 'speed') {
      const speed = readSpeed(value)
      if (value === 'auto' || speed !== 'auto') return set('thikrSpeed', String(speed), `speed ${speedText(speed)}`)

      return { text: `Speed is auto, or a whole number of seconds from ${SPEED_MIN} to ${SPEED_MAX}.` }
    }

    return { text: HELP }
  })

  if (!options.thikr) return

  on('turn.start', async ($, e, next) => {
    group = undefined
    played.clear()
    lastStart = pickStart(STARTING.length, lastStart, Math.random())
    played.set('starting', startOf('starting', lastStart, options.thikrSpeed))
    hasMovedOn = false
    isCompacting = false
    subagents = 0
    toolsSince.clear()
    ticker?.cancel()
    ticker = options.thikrSalawat ? undefined : $.clock.every(TICK_MS, () => $.ui.invalidate('ui.render'))
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
    const text = options.thikrSalawat ? SALAWAT : phraseAt(current, now - groupSince, options.thikrSpeed)
    const phrase = display(text, options.thikrTashkeel)

    const shown = withThikr(e.surface, e.props, phrase)

    return next({ ...e, props: { ...e.props, ...shown, suffix: '' } })
  })

  if (options.thikrEnd) {
    on('ui.render', { component: 'TurnDuration' }, async ($, e, next) =>
      next({ ...e, props: { ...e.props, word: display(END_OF_TURN, options.thikrTashkeel) } }),
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
        <Text key="usage-limit" color="claude">{display(USAGE_LIMIT, options.thikrTashkeel)}</Text>
        {theirs}
      </Box>
    )
  })
}

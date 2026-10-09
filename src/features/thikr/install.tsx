import { atom, read } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'

import type { UsageLimit } from '../../../types'
import { SPEED_MAX, SPEED_MIN } from '../../config.ts'
import type { Options } from '../../config.ts'
import { limitUntil } from './limit.ts'
import { END_OF_TURN, USAGE_LIMIT } from './phrases.ts'
import { display, groupFor, phraseAt, withThikr } from './rotation.ts'
import type { Group } from './rotation.ts'

const usageLimit = atom({ plugin: 'muslim', key: 'usageLimit' } as const, null as UsageLimit | null)

const HELP = [
  '/thikr                    status',
  '/thikr on | off           show tasabih while Claude works',
  `/thikr speed <${SPEED_MIN}-${SPEED_MAX}>       seconds per phrase`,
  '/thikr tashkeel on | off  show diacritics',
  '/thikr end on | off       تَمَّ بِحَمْدِ اللَّهِ at the end of a turn',
].join('\n')

const setLimit = ($: EngineInterface, value: UsageLimit | null) =>
  $.state.set({ plugin: 'muslim', key: 'usageLimit' }, value)

const onOff = (value: boolean) => (value ? 'on' : 'off')

export const install = (on: On, options: Options) => {
  // Spinner timing, per turn. Module values: a reload mid-turn only restarts the order.
  let group: Group | undefined
  let groupSince = 0
  let hasMovedOn = false
  let ticker: { cancel: () => void } | undefined

  on('command.run', { command: 'thikr' }, async ($, e) => {
    const [word = '', value = ''] = e.args.trim().split(/\s+/)
    const set = async (field: string, to: boolean | number, said: string) => {
      const { deny } = await $.config.set({ key: `muslim.${field}`, value: to })

      return { text: deny ? `Not changed: ${deny}` : said }
    }

    if (word === '') {
      return {
        text: [
          `thikr ${onOff(options.thikr)} · speed ${options.thikrSpeed}s · tashkeel ${onOff(options.thikrTashkeel)} · end ${onOff(options.thikrEnd)}`,
          '',
          HELP,
        ].join('\n'),
      }
    }
    if (word === 'on' || word === 'off') return set('thikr', word === 'on', `thikr ${word}`)
    if ((word === 'tashkeel' || word === 'end') && (value === 'on' || value === 'off')) {
      const field = word === 'tashkeel' ? 'thikrTashkeel' : 'thikrEnd'

      return set(field, value === 'on', `${word} ${value}`)
    }
    if (word === 'speed') {
      const seconds = Number(value)
      if (Number.isInteger(seconds) && seconds >= SPEED_MIN && seconds <= SPEED_MAX) {
        return set('thikrSpeed', seconds, `speed ${seconds}s`)
      }

      return { text: `Speed is a whole number of seconds from ${SPEED_MIN} to ${SPEED_MAX}.` }
    }

    return { text: HELP }
  })

  if (!options.thikr) return

  on('turn.start', async ($, e, next) => {
    group = undefined
    hasMovedOn = false
    ticker?.cancel()
    ticker = $.clock.every(options.thikrSpeed * 1000, () => $.ui.invalidate('ui.render'))
    await setLimit($, null)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    ticker?.cancel()
    ticker = undefined

    return next(e)
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const now = await $.clock.now()
    if (e.props.mode !== 'requesting') hasMovedOn = true
    const current = groupFor(e.props.mode, hasMovedOn)
    if (current !== group) {
      group = current
      groupSince = now
    }
    const phrase = display(phraseAt(current, now - groupSince, options.thikrSpeed), options.thikrTashkeel)

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

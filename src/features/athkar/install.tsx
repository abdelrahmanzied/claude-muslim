import { atom, read } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'

import type { Day } from '../../../types'
import type { Options } from '../../config.ts'
import { display } from '../thikr/rotation.ts'
import { ADVANCE_MS, countOf, currentOf, dayOf, emptyReading, isAct, listFor, periodAt, readDay, shouldAdvance, skyAt, step, timesOf } from './logic.ts'
import type { Act } from './logic.ts'
import type { Period } from './data.ts'
import { ACCENTS, lookFor, readerProps, skySvg } from './look.ts'
import type { Accent, Style } from './look.ts'

const dayRef = atom({ plugin: 'muslim', key: 'athkar' } as const, null as Day | null)

// Kept across sessions; today's reading for both periods.
const STORE_KEY = 'athkar'

const STYLES: readonly Style[] = ['sky', 'sand', 'outline']
const COLORS = Object.keys(ACCENTS) as Accent[]

const HELP = [
  '/athkar                          status, and show the athkar again',
  '/athkar on | off                 the athkar above the prompt',
  '/athkar morning | evening reset  read that period again from the start',
  '/athkar style sky | sand | outline',
  '/athkar color orange | green | gold | blue',
].join('\n')

// Rough size of a cell on the desktop, in CSS pixels, to size the sky picture.
const CELL_WIDTH = 8.4
const CELL_HEIGHT = 20

const isStyle = (value: string): value is Style => (STYLES as readonly string[]).includes(value)
const isColor = (value: string): value is Accent => (COLORS as readonly string[]).includes(value)
const isPeriod = (value: string): value is Period => value === 'morning' || value === 'evening'

const localNow = async ($: EngineInterface) => new Date(await $.clock.now())

const hourOf = (date: Date) => date.getHours() + date.getMinutes() / 60

// Today's reading as held this session, else as stored, or a fresh day once
// the day has turned.
const today = async ($: EngineInterface) => {
  const now = await localNow($)
  const { value } = await $.state.get({ plugin: 'muslim', key: 'athkar' })

  return { now, day: readDay(value ?? (await $.store.get(STORE_KEY)), dayOf(now)) }
}

const save = async ($: EngineInterface, day: Day) => {
  await $.state.set({ plugin: 'muslim', key: 'athkar' }, day)
  await $.store.set(STORE_KEY, day)
}

const statusOf = (day: Day, period: Period) => {
  const reading = day[period]
  const list = listFor(period)
  if (reading.isDone) return `${period} done ✓`
  const begun = list.filter(thikr => countOf(thikr, reading) > 0).length

  return `${period} ${begun === 0 ? 'not started' : `${reading.index + 1} of ${list.length}`}${reading.isHidden ? ' (hidden)' : ''}`
}

// Moves on after a thikr's last count, unless the reader moved meanwhile.
const advance = async ($: EngineInterface, period: Period, index: number) => {
  const { day } = await today($)
  const reading = day[period]
  const thikr = currentOf(period, reading)
  if (reading.index !== index || reading.isDone || countOf(thikr, reading) < timesOf(thikr, reading)) return
  await save($, { ...day, [period]: step(period, reading, { act: 'next' }) })
}

export const install = (on: On, options: Options) => {
  // The sky follows the clock, and the period and the day turn on it.
  let clock: { cancel: () => void } | undefined

  on('command.run', { command: 'athkar' }, async ($, e) => {
    const [word = '', value = ''] = e.args.trim().split(/\s+/)
    const set = async (field: string, to: boolean | string, said: string) => {
      const { deny } = await $.config.set({ key: `muslim.${field}`, value: to })

      return { text: deny ? `Not changed: ${deny}` : said }
    }

    if (word === '') {
      const { now, day } = await today($)
      const period = periodAt(now.getHours())
      if (day[period].isHidden) await save($, { ...day, [period]: { ...day[period], isHidden: false } })

      return {
        text: [
          `athkar ${options.athkar ? 'on' : 'off'} · style ${options.athkarStyle} · color ${options.athkarColor}`,
          `${statusOf(day, 'morning')} · ${statusOf(day, 'evening')}`,
          '',
          HELP,
        ].join('\n'),
      }
    }
    if (word === 'on' || word === 'off') return set('athkar', word === 'on', `athkar ${word}`)
    if (word === 'style' && isStyle(value)) return set('athkarStyle', value, `style ${value}`)
    if (word === 'color' && isColor(value)) return set('athkarColor', value, `color ${value}`)
    if (isPeriod(word) && value === 'reset') {
      const { day } = await today($)
      await save($, { ...day, [word]: emptyReading() })

      return { text: `${word} athkar start again from the first` }
    }

    return { text: HELP }
  })

  if (!options.athkar) return

  on('ui.message', async ($, e, next) => {
    if (e.element !== 'athkar') return next(e)
    if (!isAct(e.data)) return {}
    const act: Act = e.data
    const { now, day } = await today($)
    const period = periodAt(now.getHours())
    const before = day[period]
    const after = step(period, before, act)
    await save($, { ...day, [period]: after })
    if (act.act === 'count' && shouldAdvance(period, before, after)) {
      $.clock.after(ADVANCE_MS, () => void advance($, period, after.index))
    }

    return {}
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    if (e.props.hasSurvey) return theirs
    // Read while drawing so a save draws the band again; before the first
    // save this session, the stored day.
    const held = (await read($, dayRef)) ?? (await $.store.get(STORE_KEY))
    clock ??= $.clock.every(60_000, () => $.ui.invalidate('ui.render'))
    const now = await localNow($)
    const period = periodAt(now.getHours())
    const reading = readDay(held, dayOf(now))[period]
    if (reading.isHidden || (e.surface !== 'terminal' && e.surface !== 'desktop')) return theirs

    const hasPicture = options.athkarStyle === 'sky' && e.surface === 'desktop'
    const sky = skyAt(hourOf(now))
    // Light themes take the deeper main colors.
    const theme = (await $.config.list()).find(row => row.key === 'theme')
    const isDark = !String(theme?.value ?? '').includes('light')
    const look = lookFor(options.athkarStyle, options.athkarColor, sky, isDark, hasPicture)
    const props = readerProps(period, reading, look, text => display(text, true))
    const { Box, Client } = $.ui.resolve(e)
    const reader = <Client key="athkar" module="./reader.tsx" props={props} flexGrow={1} />

    let band = <Box key="athkar-band" width="100%">{reader}</Box>
    if (e.surface === 'desktop' && hasPicture) {
      const { Svg } = $.ui.resolve(e)
      const columns = e.props.bodyColumns
      const lines = Math.ceil(props.text.length / Math.max(20, columns - 6)) + props.text.split('\n').length - 1
      const rows = props.isDone ? 3 : lines + 6
      const source = skySvg(sky, columns * CELL_WIDTH, rows * CELL_HEIGHT, props.isDone)
      band = (
        <Box key="athkar-band" width="100%" position="relative" overflow="hidden" backgroundColor={look.under}>
          <Box position="absolute" top={0} left={0}>
            <Svg source={source} alt={`${sky} sky`} isInteractive />
          </Box>
          {reader}
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {band}
        {theirs}
      </Box>
    )
  })
}

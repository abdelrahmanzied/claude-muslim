import { atom, read } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'

import type { Day } from '../../../types'
import type { Options } from '../../config.ts'
import { display } from '../thikr/rotation.ts'
import { bandHeight, closeArea, pixelOf } from './band.ts'
import type { BandModel } from './band.ts'
import type { Period } from './data.ts'
import { ADVANCE_MS, countOf, currentOf, dayOf, emptyReading, END, listFor, overall, periodAt, readDay, shouldAdvance, skyAt, step, textOf, timesOf, TITLE } from './logic.ts'
import type { Act } from './logic.ts'
import { ACCENTS, lookFor, plain, readerProps } from './look.ts'
import type { Accent, Style } from './look.ts'

const dayRef = atom({ plugin: 'muslim', key: 'athkar' } as const, null as Day | null)

// Kept across sessions; today's reading for both periods.
const STORE_KEY = 'athkar'

const STYLES: readonly Style[] = ['sky', 'frame']
const COLORS = Object.keys(ACCENTS) as Accent[]

const HELP = [
  '/athkar                          status, and show the athkar again',
  '/athkar on | off                 the athkar above the prompt',
  '/athkar morning | evening reset  read that period again from the start',
  '/athkar style sky | frame',
  '/athkar color orange | green | gold | blue',
].join('\n')

// The width of a cell on the desktop in CSS pixels: the band picture is sized
// from the columns it is given.
const CELL_PX = 8.4
// The folded row's height: one line of text, in CSS pixels (the card adds a line to it).
const REST_PX = 24
// A line on the desktop in CSS pixels.
const LINE_PX = 20
// How long the progress glow slides to a new value.
const GLOW_MS = 700
// The finale when a set is finished: the band stands this tall while stars
// fall and the dua rises, then settles to the done row.
const FINALE_MS = 3200
const FINALE_PX = 240

// Where the glow stands some time into a slide, on the slide's ease-out curve.
const glowAtTime = (from: number, to: number, ms: number) => {
  const t = Math.min(1, Math.max(0, ms / GLOW_MS))

  return from + (to - from) * (1 - (1 - t) ** 3)
}
// A focus change this soon after a press on the band is the press's own.
const FOCUS_GRACE_MS = 600
// Faded again after this long with no input.
const IDLE_MS = 90_000
// How long the pointer may be off the band before it fades.
const LEAVE_MS = 1000
// Counting by keys with the pointer off the band: it fades this long after the last key.
const KEY_REST_MS = 3000

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
  if (reading.index !== index || reading.isDone || countOf(thikr, reading) < timesOf(thikr)) return
  await save($, { ...day, [period]: step(period, reading, { act: 'next' }) })
}

// One step of today's reading, saved; after a count that ends a thikr, the
// next one shows by itself.
const apply = async ($: EngineInterface, act: Act) => {
  const { now, day } = await today($)
  const period = periodAt(now.getHours())
  const before = day[period]
  const after = step(period, before, act)
  await save($, { ...day, [period]: after })
  if (act.act === 'count' && shouldAdvance(period, before, after)) {
    $.clock.after(ADVANCE_MS, () => void advance($, period, after.index))
  }
}

// What the reader posts: every click and key, and its size.
type Message =
  | { act: 'pointer'; button: 'left' | 'middle' | 'right'; x: number; y: number; columns?: number; rows?: number }
  | { act: 'key'; key: string }
  | { act: 'size'; columns: number; rows: number }
  | { act: 'hide' }
  | { act: 'enter' }
  | { act: 'leave' }

const isMessage = (value: unknown): value is Message => {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  if (m.act === 'pointer') return typeof m.x === 'number' && typeof m.y === 'number'
  if (m.act === 'key') return typeof m.key === 'string'
  if (m.act === 'size') return typeof m.columns === 'number' && typeof m.rows === 'number'

  return m.act === 'hide' || m.act === 'enter' || m.act === 'leave'
}

// Where the picture's controls sit, in CSS pixels as the band lays them out:
// the × at the top left (the folded row's is its whole height). A press
// anywhere else counts or opens the band.
type Hit = { x0: number; x1: number; y0: number; y1: number; act: Act }

export const hitsFor = (m: Pick<BandModel, 'phase' | 'isActive' | 'restHeight' | 'finaleMs'>): Hit[] => [{ ...closeArea(m), act: { act: 'hide' } }]

// This session's view: past the cover, lit, and when it fades.
const view = {
  isOpen: false,
  isActive: false,
  idle: undefined as { cancel: () => void } | undefined,
  // Set while the pointer is off the band: it fades unless it comes back.
  leave: undefined as { cancel: () => void } | undefined,
  // The pointer is over the band.
  isInside: false,
  pressedAt: 0,
}

// Lights the band, and fades it again after a while with no input.
const wake = ($: EngineInterface) => {
  view.isActive = true
  view.idle?.cancel()
  view.idle = $.clock.after(IDLE_MS, () => {
    view.isActive = false
    $.ui.invalidate('ui.render')
  })
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

export const install = (on: On, options: Options) => {
  // The sky follows the clock, and the period and the day turn on it.
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
      view.isOpen = false
      // Back at the cover, folded: the person has moved on to the prompt.
      rest($)

      return { text: `${word} athkar start again from the first` }
    }

    return { text: HELP }
  })

  if (!options.athkar) return

  on('ui.message', async ($, e, next) => {
    if (e.element !== 'athkar') return next(e)
    const m = e.data
    if (!isMessage(m)) return {}
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
    if (m.act === 'pointer' && m.button === 'left' && lastBand && columns > 0 && rows > 0) {
      // The × sits at the left, so a click is placed from the left edge.
      const { px, py } = pixelOf(lastBand, m.x, m.y, columns, rows)
      const hit = hitsFor(lastBand).find(h => px >= h.x0 && px <= h.x1 && py >= h.y0 && py <= h.y1)
      if (hit) {
        if (hit.act.act === 'hide') view.isOpen = false
        await apply($, hit.act)

        return {}
      }
    }
    const { now, day } = await today($)
    const reading = day[periodAt(now.getHours())]
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
    if (isCount) await apply($, { act: 'count' })
    else if (isBack) await apply($, { act: 'back' })
    else if (m.act === 'key' && m.key === 'left') await apply($, { act: 'next' })
    else if (m.act === 'key' && m.key === 'right') await apply($, { act: 'previous' })

    return {}
  })

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
    // An earlier build left a debugging line in the status bar: clear it once.
    if (!isStatusCleared) {
      isStatusCleared = true
      $.ui.status(undefined)
    }
    if (e.props.hasSurvey || (e.surface !== 'terminal' && e.surface !== 'desktop')) return theirs
    // Read while drawing so a save draws the band again; before the first
    // save this session, the stored day.
    const held = (await read($, dayRef)) ?? (await $.store.get(STORE_KEY))
    clock ??= $.clock.every(60_000, () => $.ui.invalidate('ui.render'))
    const now = await localNow($)
    const period = periodAt(now.getHours())
    const reading = readDay(held, dayOf(now))[period]
    if (reading.isHidden) return theirs

    // Light themes take the deeper main colors.
    const theme = (await $.config.list()).find(row => row.key === 'theme')
    const isDark = !String(theme?.value ?? '').includes('light')
    const isPicture = e.surface === 'desktop'
    const sky = skyAt(hourOf(now))
    const look = lookFor(options.athkarStyle, options.athkarColor, sky, isDark, isPicture)
    const props = readerProps(period, reading, look, text => display(text, true), { isOpen: view.isOpen, isActive: view.isActive, isPicture })
    // Finished just now, not found finished on a reload: the finale plays once.
    if (props.phase === 'done' && lastPhase !== undefined && lastPhase !== 'done') {
      finishedAt = Date.now()
      $.clock.after(FINALE_MS, () => $.ui.invalidate('ui.render'))
    }
    lastPhase = props.phase
    const finaleMs = props.phase === 'done' && Date.now() - finishedAt < FINALE_MS ? Date.now() - finishedAt : undefined
    const { Box, Client } = $.ui.resolve(e)

    if (e.surface !== 'desktop') {
      return (
        <Box flexDirection="column">
          <Box key="athkar-band" width="100%">
            <Client key="athkar" module="./reader.tsx" props={props} flexGrow={1} />
          </Box>
          {theirs}
        </Box>
      )
    }

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
      period,
      sky,
      style: options.athkarStyle,
      finaleMs,
      accent: options.athkarColor,
      isDark,
      isActive: view.isActive,
      hasBegun: props.hasBegun,
      title: display(TITLE[period], true),
      thikrId: thikr.id,
      text: display(textOf(thikr, period), true),
      note: props.note,
      position: props.position,
      count: Math.min(countOf(thikr, reading), times),
      times,
      progress,
      from: glowMs < GLOW_MS ? glowFrom : progress,
      glowMs: glowMs < GLOW_MS ? glowMs : 0,
      end: display(END, true),
      endHint: props.endHint,
      now: now.getTime(),
      width,
      height: 0,
      restHeight: REST_PX,
      card: { ch: CELL_PX, lh: LINE_PX },
    }
    // The finale stands as tall as the desktop lets the band be.
    model.height = finaleMs === undefined ? bandHeight(model, width) : Math.min(FINALE_PX, Math.max(56, (e.props.maxRows - 2) * LINE_PX))
    lastBand = model

    return (
      // The desktop's card pads the band, and its scroller is the card's whole
      // box: the picture reaches into that padding, a cell each side and half a
      // line above and below. The desktop drops vertical margins down a root's
      // line of only children, so the band always has a sibling.
      <Box flexDirection="column">
        <Box key="athkar-band" marginX={-1} marginY={-1}>
          <Client key="athkar" module="./reader.tsx" props={plain({ ...props, band: model })} width="100%" />
        </Box>
        {theirs ?? <Box key="athkar-end" height={0} />}
      </Box>
    )
  })
}

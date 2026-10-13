import { isDarkTheme } from '../../shared/color/index.ts'
import { defaultArabicMode, isArabicMode, terminalArabic, terminalIdFromEnv, type ArabicMode } from '../../shared/arabic/terminal.ts'
import { atom, read } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'

import type { Day, SalahCard } from '../../../types'
import type { Options } from '../../config.ts'
import { withTashkeel } from '../../shared/arabic/visual.ts'
import { helpHint, statusTable } from '../../table.ts'
import { athkarHelp } from './help.ts'
import { CELL_PX, FOCUS_GRACE_MS, IDLE_MS, isCardMessage, KEY_REST_MS, LEAVE_MS, LINE_PX, REST_PX } from '../../shared/card/card.ts'
import { bandHeight, closeArea, pixelOf } from './band.ts'
import type { BandModel } from './band.ts'
import type { Period } from './data.ts'
import { ADVANCE_MS, countOf, currentOf, dayOf, emptyReading, END, listFor, overall, periodAt, readDay, shouldAdvance, skyAt, step, textOf, timesOf, TITLE } from './logic.ts'
import type { Act } from './logic.ts'
import { lookFor, plain, readerProps } from './look.ts'
import type { Style } from './look.ts'

// DEMO BEGIN: imports and transient runner (no saved state or real view).
import type { Accent } from '../../shared/color/index.ts'
import { demoDuration, demoReply, demoStep, DEMO_TICK_MS } from './demo.ts'
import { connectDemo, doneDemo } from '../../shared/demo/signal.ts'

// shared: started by /muslim demo, which waits for this demo's end.
let demo: { style: Style; accent: Accent; startedAt: number; shared: boolean; timer?: { cancel: () => void } } | undefined
const demoArabicCache: { current: { terminalId: string; mode: ArabicMode } | null } = { current: null }

const tickDemo = async ($: EngineInterface) => {
  const playing = demo
  if (!playing) return
  const now = await $.clock.now()
  if (demo !== playing) return
  if (now - playing.startedAt >= demoDuration(playing.style, FINALE_MS)) {
    playing.timer?.cancel()
    demo = undefined
    $.ui.invalidate('ui.render')
    if (playing.shared) doneDemo('athkar')
    return
  }
  $.ui.invalidate('ui.render')
}

const playDemo = async ($: EngineInterface, style: Style, accent: Accent, shared = false) => {
  demo?.timer?.cancel()
  demo = { style, accent, startedAt: await $.clock.now(), shared }
  demo.timer = $.clock.every(DEMO_TICK_MS, () => void tickDemo($))
  $.ui.invalidate('ui.render')

  return demoReply(style, FINALE_MS)
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

const dayRef = atom({ plugin: 'muslim', key: 'athkar' } as const, null as Day | null)

// Kept across sessions; today's reading for both periods.
const STORE_KEY = 'athkar'

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
  if (reading.isDone) return 'done ✓'
  const begun = list.filter(thikr => countOf(thikr, reading) > 0).length

  return `${begun === 0 ? 'not started' : `${reading.index + 1} of ${list.length}`}${reading.isHidden ? ' (hidden)' : ''}`
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

// Where the picture's controls sit, in CSS pixels as the band lays them out:
// the × at the top left (the folded row's is its whole height). A press
// anywhere else counts or opens the band.
type Hit = { x0: number; x1: number; y0: number; y1: number; act: Act }

export const hitsFor = (m: Pick<BandModel, 'phase' | 'isActive' | 'restHeight' | 'finaleMs'>): Hit[] => [{ ...closeArea(m), act: { act: 'hide' } }]

// This session's view: past the cover, lit, and when it fades.
const arabicCache: { current: { terminalId: string; mode: ArabicMode } | null } = { current: null }

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
      const { now, day } = await today($)
      const period = periodAt(now.getHours())
      if (day[period].isHidden) await save($, { ...day, [period]: { ...day[period], isHidden: false } })

      return {
        text: [
          '**Muslim › Athkar**',
          helpHint('/athkar'),
          '',
          statusTable([
            ['Athkar', 'Morning and evening athkar above the prompt', options.athkar ? 'on' : 'off'],
            ['Style', 'The look; sky is desktop only', await $.session.surface() === 'terminal' ? 'frame (terminal)' : options.athkarStyle],
            ['Morning', 'Today\'s morning athkar', statusOf(day, 'morning')],
            ['Evening', 'Today\'s evening athkar', statusOf(day, 'evening')],
          ]),
        ].join('\n'),
      }
    }
    if (word === 'help') return { text: athkarHelp() }
    if (word === 'on' || word === 'off') return set('athkar', word === 'on', `athkar ${word}`)
    if (word === 'style' && await $.session.surface() === 'terminal') return { text: 'The terminal always shows the frame; sky is desktop only. Change the style from the desktop app.' }
    if (word === 'style' && isStyle(value)) return set('athkarStyle', value, `style ${value}`)
    if (word === 'color') return { text: 'Color is now /muslim color.' }
    if (isPeriod(word) && value === 'reset') {
      const { day } = await today($)
      await save($, { ...day, [word]: emptyReading() })
      view.isOpen = false
      // Back at the cover, folded: the person has moved on to the prompt.
      rest($)

      return { text: `${word} athkar start again from the first` }
    }

    return { text: athkarHelp() }
  })

  // DEMO BEGIN: a separate drawing path, registered even with athkar off.
  on('command.run', { command: 'muslim', args: /^\s*demo\s*$/ }, ($, e, next) => {
    connectDemo('athkar', async () => playDemo($, await $.session.surface() === 'terminal' ? 'frame' : options.athkarStyle, options.color, true))
    return next(e)
  })

  // The surface matcher distinguishes this registration from the real band.
  on('ui.render', { component: 'AbovePrompt', surface: ['desktop', 'terminal'] }, async ($, e, next) => {
    const theirs = await next(e)
    const playing = demo
    if (!playing || e.props.hasSurvey || (playing.style === 'sky' && e.surface !== 'desktop')) return theirs
    const now = await $.clock.now()
    const scene = demoStep(playing.style, playing.accent, now - playing.startedAt, FINALE_MS)
    if (!scene) return theirs
    const isPicture = e.surface === 'desktop'
    if (isPicture) {
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
  if (!options.athkar) return

  on('ui.message', { element: 'athkar' }, async ($, e) => {
    const m = e.data
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
    if (demo && (demo.style === 'frame' || e.surface === 'desktop')) return theirs
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
    const theme = (await $.config.list().catch(() => [])).find(row => row.key === 'theme')
    const isDark = isDarkTheme(theme?.value)
    const isPicture = e.surface === 'desktop'
    const sky = skyAt(hourOf(now))
    // Sky is desktop only; the terminal always draws the frame.
    const look = lookFor(isPicture ? options.athkarStyle : 'frame', options.color, sky, isDark, isPicture)
    // The shared Arabic path: the tashkeel setting, then this terminal's mode.
    const arabicMode = await arabicModeOf($, e.surface, arabicCache)
    const show = (text: string) => terminalArabic(e.surface, arabicMode, withTashkeel(text, options.tashkeel))
    const props = readerProps(period, reading, look, show, { isOpen: view.isOpen, isActive: view.isActive, isPicture })
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

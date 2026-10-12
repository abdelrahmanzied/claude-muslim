import { accentText, type Accent } from '../../shared/color/index.ts'
import { defaultArabicMode, isArabicMode, terminalArabic, terminalIdFromEnv, type ArabicMode } from '../../shared/arabic/terminal.ts'
import { atom, read, update } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'
import type { SalahCard, SalahMinaret, SalahWindow } from '../../../types'

import { countdownMinutes, isMethod, parseShow, SHOW_MAX, SHOW_MIN, writeAdjust } from '../../config.ts'
import type { Options } from '../../config.ts'
import { CITY_MODEL, CITY_SYSTEM, cityPrompt, parseCities, parseCoordinates, type City } from './city.ts'
import { helpHint } from '../../table.ts'
import { salahHelp } from './help.ts'
import { athanDemo } from './demo.ts'
import { momentState } from './moment.ts'
import { guessPlace, systemTimeZone } from './location.ts'
import { METHODS, methodFor, type Pray } from './methods.ts'
import { ENGLISH, prayNamed } from '../../shared/pray/names.ts'
import { writePlace, type Place } from './place.ts'
import { athanText, isInWindow } from '../../shared/pray/line.ts'
import { ACCENT_ROWS, FRAME_MS, isDue, LABEL_ROW, minaretRows, minaretStage, ROWS_COUNT } from './minaret.ts'
import { nudge, reviewRows } from './review.ts'
import { CELL_PX, isCardMessage, isOnClose, LINE_PX } from '../../shared/card/card.ts'
import { athanFrame, cardIsFolded, FOLD_MS } from './card.ts'
import { clockText, lastPray, nextSalah, type Adjust } from './times.ts'
import { lineAt, methodOf, settingsTable, showText, timesTable } from './today.ts'

// The engine follows $ only into same-file top-level functions, so the
// terminal's Arabic mode is resolved here as in thikr.
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
    const saved = await $.store.get('arabicTerminals') as Record<string, unknown> | undefined
    const storedMode = saved?.[id]
    const mode = isArabicMode(storedMode) ? storedMode : defaultArabicMode(id)
    cached = { terminalId: id, mode }
    cache.current = cached
  }

  return terminalArabic(surface, cached.mode, text)
}

// Setup put off with Not now: for the session here, for good in $.store.
const setupLater = atom({ plugin: 'muslim', key: 'salahSetupLater' } as const, false)
const SETUP_LATER_KEY = 'salahSetupLater'
// The review form's minutes while it is open; null when closed. Kept in
// $.state so it survives the reload that saving the place causes.
const review = atom({ plugin: 'muslim', key: 'salahReview' } as const, null as Adjust | null)
// The pray whose countdown window we are in, for the thikr line to read.
const inWindow = atom({ plugin: 'muslim', key: 'salahWindow' } as const, null as SalahWindow | null)

// The minaret's frame while it plays, and the pray time it last played for.
const minaret = atom({ plugin: 'muslim', key: 'salahMinaret' } as const, null as SalahMinaret | null)
// The desktop athan card while it shows; null otherwise. The athkar band steps aside for it.
const card = atom({ plugin: 'muslim', key: 'salahCard' } as const, null as SalahCard | null)
// The pray line drawn in the footer's mode labels; null when there is none.
const line = atom({ plugin: 'muslim', key: 'salahLine' } as const, null as string | null)
const athanShown = atom({ plugin: 'muslim', key: 'salahAthanShown' } as const, null as number | null)

// How often the pray line is redrawn: every second inside the countdown
// window (the live countdown), else every 30 seconds.
const TICK_MS = 30_000
const WINDOW_TICK_MS = 1000

// The pray line's timer and the period it runs at, and the one-shot timer
// for the moment the next countdown window opens (so the 1 s countdown starts
// on time, not on the next 30 s tick).
type Timer = {
  moment: { cancel: () => void }[]
  handle: { cancel: () => void } | undefined
  ms: number
  opens: { at: number; handle: { cancel: () => void } } | undefined
}

const HINT = helpHint('/salah')

// The cities a typed place can mean: coordinates as typed, else Claude's
// reading of the name; a sentence when Claude could not be reached.
const findCities = async ($: EngineInterface, typed: string): Promise<City[] | string> => {
  const system = guessPlace(systemTimeZone())
  const coordinates = parseCoordinates(typed)
  if (coordinates) {
    const timeZone = system?.timeZone ?? systemTimeZone()

    return [{ name: `${coordinates.latitude}, ${coordinates.longitude}`, ...coordinates, timeZone, country: system?.country ?? 'ZZ' }]
  }
  const reply = await $.model.complete({ model: CITY_MODEL, system: CITY_SYSTEM, prompt: cityPrompt(typed, system?.country), maxTokens: 400 })

  return reply.isAnswered ? parseCities(reply.text) : 'Could not reach Claude. Try again, or type coordinates: `/salah city 48.14, 11.58`'
}

// One city of several, picked by the user; undefined when dismissed.
const pickCity = async ($: EngineInterface, typed: string, cities: City[]): Promise<City | undefined> => {
  if (cities.length < 2) return cities[0]
  const label = await $.ui.ask(`Which ${typed}?`, { header: 'City', options: cities.map(city => city.name) }).catch(() => undefined)

  return cities.find(city => city.name === label)
}

// What a typed place comes to: one city, or a sentence why not.
const cityFrom = async ($: EngineInterface, typed: string): Promise<City | string> => {
  const found = await findCities($, typed)
  if (typeof found === 'string') return found
  if (found.length === 0) return `No city found for "${typed}". Try its English name, or coordinates.`

  return (await pickCity($, typed, found)) ?? 'Not changed.'
}

// The setup question: the guessed city, or one typed under Other.
const askCity = async ($: EngineInterface, guess: Place | undefined): Promise<City | string> => {
  const question = guess
    ? `Pray times for ${guess.name}, or type your city under Other?`
    : 'Which city are you in? Type it under Other, in any language.'
  const options = guess ? [guess.name, 'Cancel'] : ['Cancel', 'Not now']
  const answer = await $.ui.ask(question, { header: 'Salah', options }).catch(() => 'Cancel')
  if (answer === 'Cancel' || answer === 'Not now') return 'Not changed.'
  if (guess && answer === guess.name) return guess

  return cityFrom($, answer)
}

// Saves the city and opens the review form; the module reloads with the city.
const savePlace = async ($: EngineInterface, city: City, options: Options): Promise<string> => {
  await update($, review, () => options.salahAdjust)
  const { deny } = await $.config.set({ key: 'muslim.salahPlace', value: writePlace(city) })
  if (deny) await update($, review, () => null)

  return deny ? `Not changed: ${deny}` : `**City:** ${city.name} · ${METHODS[methodOf(options, city)].name}\nCheck today's times above the prompt.`
}

// Keeps the pray line's row in step; writes only on a change.
const setLine = async ($: EngineInterface, text: string | undefined) => {
  const now = text ?? null
  if ((await read($, line)) !== now) await update($, line, () => now)
}

// Redraws the pray line and the athan moment.
// Resolves whether `now` is inside the countdown window.
const tick = async ($: EngineInterface, options: Options, place: Place, timer: Timer): Promise<boolean> => {
  const now = await $.clock.now()
  const method = methodOf(options, place)
  const next = nextSalah(place, method, options.salahAdjust, now)
  const last = lastPray(place, method, options.salahAdjust, now)
  await setLine($, lineAt(options, place, now))
  if (options.salahShow !== 'off' && options.salahAthan && isDue(last.at, now, await read($, athanShown))) {
    await update($, athanShown, () => last.at)
    await showAthan($, last.pray === 'sunrise' ? 'fajr' : last.pray, clockText(last.at, place.timeZone), now, timer)
  }

  const isWindow = options.salahShow !== 'off' && isInWindow(next, now, countdownMinutes(options.salahShow))
  await publishWindow($, isWindow && next.pray !== 'sunrise' ? { pray: next.pray, at: next.at } : null)
  scheduleOpen($, options, place, timer, options.salahShow !== 'off' && !isWindow ? next.at - countdownMinutes(options.salahShow) * 60_000 : undefined, now)

  return isWindow
}

// Runs one tick at the exact moment the countdown window opens (`opensAt`,
// undefined when there is nothing to wait for: inside the window, or off).
// Replaces an earlier timer only when the moment changed.
const scheduleOpen = ($: EngineInterface, options: Options, place: Place, timer: Timer, opensAt: number | undefined, now: number) => {
  if (opensAt === undefined || opensAt <= now) {
    timer.opens?.handle.cancel()
    timer.opens = undefined

    return
  }
  if (timer.opens?.at === opensAt) return
  timer.opens?.handle.cancel()
  timer.opens = { at: opensAt, handle: $.clock.after(opensAt - now, () => void run($, options, place, timer)) }
}

// Re-arm only the remaining stages from persisted deadlines. Callbacks update
// the current state, never recreate a closed moment. Handles only belong to this load.
const scheduleMoment = async ($: EngineInterface, timer: Timer) => {
  timer.moment.forEach(handle => handle.cancel())
  timer.moment = []
  const now = await $.clock.now()
  const shown = await read($, card)
  const playing = await read($, minaret)
  if (shown) {
    timer.moment.push($.clock.after(Math.max(0, shown.foldsAt - now), () => void update($, card, current =>
      current?.until === shown.until && current.foldsAt === shown.foldsAt ? { ...current, isFolded: true } : current)))
    timer.moment.push($.clock.after(Math.max(0, shown.until - now), () => void update($, card, current =>
      current?.until === shown.until ? null : current)))
  }
  if (playing) {
    for (let frame = 2; frame <= ROWS_COUNT; frame++) {
      const at = playing.startedAt + (frame - 1) * FRAME_MS
      if (at <= now || playing.isFolded) continue
      timer.moment.push($.clock.after(at - now, () => void update($, minaret, current =>
        current?.until === playing.until ? { ...current, frame } : current)))
    }
    timer.moment.push($.clock.after(Math.max(0, playing.foldsAt - now), () => void update($, minaret, current =>
      current?.until === playing.until ? { ...current, isFolded: true } : current)))
    timer.moment.push($.clock.after(Math.max(0, playing.until - now), () => void update($, minaret, current =>
      current?.until === playing.until ? null : current)))
  }
}

// The athan moment: its states in $.state and the timers that fold and end it.
const showAthan = async ($: EngineInterface, pray: SalahMinaret['pray'], time: string, now: number, timer: Timer) => {
  const moment = momentState(pray, time, now)
  await update($, minaret, () => moment.minaret)
  await update($, card, () => moment.card)
  await scheduleMoment($, timer)
}

const closeMoment = async ($: EngineInterface, timer: Timer) => {
  await update($, card, () => null)
  await update($, minaret, () => null)
  timer.moment.forEach(handle => handle.cancel())
  timer.moment = []
}

// The card's photo, read from the mod's own file; undefined if it cannot be read.
const PHOTO = 'src/features/salah/assets/haram.jpg'

const readPhoto = async ($: EngineInterface): Promise<string | undefined> => {
  const bytes = await $.fs.read(`${$.plugin.root}/${PHOTO}`, { as: 'bytes' }).catch(() => undefined)

  return typeof bytes === 'object' ? bytes.base64 : undefined
}

// `/salah athan demo`: shows the athan moment now for the next pray, without
// touching settings or the shown-once mark.
const playDemo = async ($: EngineInterface, options: Options, place: Place, timer: Timer) => {
  const now = await $.clock.now()
  const demo = athanDemo(options, place, now)
  await showAthan($, demo.pray, demo.time, now, timer)

  return demo.text
}

// Tells the thikr line which pray's window we are in; writes only on a change.
const publishWindow = async ($: EngineInterface, moment: SalahWindow | null) => {
  const current = await read($, inWindow)
  if (current?.pray === moment?.pray && current?.at === moment?.at) return
  await update($, inWindow, () => moment)
}

// One tick, then the timer runs every second in the window and every 30 s outside it.
const run = async ($: EngineInterface, options: Options, place: Place, timer: Timer) => {
  const isWindow = await tick($, options, place, timer)
  const ms = isWindow ? WINDOW_TICK_MS : TICK_MS
  if (ms === timer.ms) return
  timer.handle?.cancel()
  timer.ms = ms
  timer.handle = $.clock.every(ms, () => void run($, options, place, timer))
}

const putOff = async ($: EngineInterface) => {
  await update($, setupLater, () => true)
  await $.store.set(SETUP_LATER_KEY, true)
}

// The first tick runs right after the caller.
// Drops a line and window left by the last load, after this draw: drawing is read-only.
const clearLine = ($: EngineInterface) => {
  $.clock.after(0, async () => {
    await setLine($, undefined)
    await publishWindow($, null)
  })
}

const begin = async ($: EngineInterface, options: Options, place: Place, timer: Timer) => {
  $.clock.after(0, async () => {
    await run($, options, place, timer)
  })
}

export const install = (on: On, options: Options) => {
  const arabicCache: { current: { terminalId: string; mode: ArabicMode } | null } = { current: null }
  const guess = guessPlace(systemTimeZone())
  // The pray line's timer, started once per module load by whichever of the
  // prompt band or the footer is drawn first (a reload, e.g. after any setting
  // change, starts it again; register also asks for a redraw at session.start).
  let hasTicker = false
  let isLineCleared = false
  const timer: Timer = { moment: [], handle: undefined, ms: 0, opens: undefined }
  // The card's photo (base64), read the first time the card is drawn.
  const photo: { base64: string | undefined } = { base64: undefined }
  // The athan card last drawn and its region, for its clicks.
  const athan: { props: { isFolded: boolean; width: number; card: { ch: number; lh: number } } | undefined; region: { columns: number; rows: number } } = { props: undefined, region: { columns: 0, rows: 0 } }

  on('command.run', { command: 'salah' }, async ($, e) => {
    const [word = '', first = '', second = ''] = e.args.trim().split(/\s+/)
    const set = async (field: string, to: boolean | number | string, said: string) => {
      const { deny } = await $.config.set({ key: `muslim.${field}`, value: to })

      return { text: deny ? `Not changed: ${deny}` : said }
    }

    if (word === '') {
      const place = options.salahPlace
      if (!place) return { text: ['Not set up yet. Run `/salah city`.', '', HINT].join('\n') }

      // The host puts `muslim: ` before the first line, so a title goes there, not a table.
      return {
        text: ['**Muslim › Salah**', HINT, '', `### Today in ${place.name}`, '', timesTable(options, place, await $.clock.now()), '', '### Settings', '', settingsTable(options, place)].join('\n'),
      }
    }
    if (word === 'help') return { text: salahHelp() }
    // `show` picks when the pray line shows: always, minutes before a pray, or off.
    if (word === 'show') {
      if (first === '') return { text: `**Show:** ${showText(options.salahShow)}\nChange: \`/salah show always\` · \`<minutes>\` · \`off\`` }
      const show = second === '' ? parseShow(first) : undefined
      if (show === undefined) return { text: `Use \`/salah show always\`, \`/salah show off\`, or minutes from ${SHOW_MIN} to ${SHOW_MAX}, e.g. \`/salah show 20\`.` }

      return set('salahShow', String(show), `**Show:** ${showText(show)}`)
    }
    if (word === 'athan' && first === 'demo') {
      const place = options.salahPlace
      if (!place) return { text: 'Set your city first: `/salah city`' }

      return { text: await playDemo($, options, place, timer) }
    }
    if (word === 'athan' && (first === 'on' || first === 'off')) return set('salahAthan', first === 'on', `**Athan:** ${first}`)
    if (word === 'city') {
      const typed = e.args.trim().slice('city'.length).trim()
      const city = typed === '' ? await askCity($, guess) : await cityFrom($, typed)

      return { text: typeof city === 'string' ? city : await savePlace($, city, options) }
    }
    if (word === 'method') {
      if (first === 'auto') return set('salahMethod', first, `**Method:** auto${options.salahPlace ? ` (${METHODS[methodFor(options.salahPlace.country)].name})` : ''}`)
      if (isMethod(first)) return set('salahMethod', first, `**Method:** ${METHODS[first].name}`)

      return { text: `Use \`/salah method auto\` or one of: ${Object.keys(METHODS).join(', ')}.` }
    }
    if (word === 'adjust' && first === '') {
      if (!options.salahPlace) return { text: 'Set your city first: `/salah city`' }
      await update($, review, () => options.salahAdjust)

      return { text: '**Adjust:** use − and + above the prompt, then Save.' }
    }
    if (word === 'adjust') {
      const pray = prayNamed(first)
      const minutes = Number(second)
      if (!pray || second === '' || !Number.isInteger(minutes)) {
        return { text: 'Use `/salah adjust <pray> <±min>`, e.g. `/salah adjust asr +5`.' }
      }
      const adjust = { ...options.salahAdjust, [pray]: minutes }
      const sign = minutes > 0 ? '+' : ''

      return set('salahAdjust', writeAdjust(adjust), `**Adjust:** ${ENGLISH[pray]} ${sign}${minutes} min`)
    }

    return { text: salahHelp() }
  })

  // A reload restores a moment still showing (a real one or `/salah athan demo`).
  // Rendering stays read-only; the clock callback re-arms and normalizes state.
  let hasMomentTimers = false
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!hasMomentTimers) {
      hasMomentTimers = true
      $.clock.after(0, () => void scheduleMoment($, timer))
    }
    return next(e)
  })

  // Starts the pray line's timer (or clears the line when off) on the first draw of the band or the footer.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const place = options.salahPlace
    if (options.salahShow !== 'off' && place && !hasTicker) {
      hasTicker = true
      await begin($, options, place, timer)
    }
    if (!(options.salahShow !== 'off' && place) && !isLineCleared) {
      isLineCleared = true
      clearLine($)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const place = options.salahPlace
    if (options.salahShow !== 'off' && place && !hasTicker) {
      hasTicker = true
      await begin($, options, place, timer)
    }
    if (!(options.salahShow !== 'off' && place) && !isLineCleared) {
      isLineCleared = true
      clearLine($)
    }

    return next(e)
  })

  // After the place is saved, or on /salah adjust: today's times to check
  // against the user's mosque, each moved a minute at a time, then saved.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    const place = options.salahPlace
    const draft = await read($, review)
    if (!place || !draft || e.props.hasSurvey) return theirs
    const { Box, Button, Text } = $.ui.resolve(e)
    const rows = reviewRows(place, methodOf(options, place), draft, await $.clock.now())
    const move = (pray: Pray, step: number) => update($, review, now => (now ? nudge(now, pray, step) : now))
    const save = async () => {
      const { deny } = await $.config.set({ key: 'muslim.salahAdjust', value: writeAdjust(draft) })
      if (deny) return void $.ui.toast(`Not changed: ${deny}`)
      await update($, review, () => null)
    }

    return (
      <Box flexDirection="column">
        <Text key="salah-review" color={await mainColor($, options.color)}>{`Check today's times in ${place.name} against your mosque's, then save.`}</Text>
        {rows.map(row => (
          <Box key={`salah-${row.pray}`} gap={1}>
            <Text>{row.name}</Text>
            <Text bold>{row.time}</Text>
            <Button key={`salah-${row.pray}-minus`} label="−" onPress={() => move(row.pray, -1)} />
            <Text dimColor>{row.minutes}</Text>
            <Button key={`salah-${row.pray}-plus`} label="+" onPress={() => move(row.pray, 1)} />
          </Box>
        ))}
        <Box key="salah-review-actions" gap={1}>
          <Button key="salah-save" label="Save" variant="primary" onPress={save} />
          <Button key="salah-skip" label="Skip" dimColor onPress={() => update($, review, () => null)} />
        </Box>
        {theirs}
      </Box>
    )
  })

  // The pray line: plain text in the mode labels at the right of the prompt
  // footer, before the model name, beside whatever else draws there.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const theirs = await next(e)
    const place = options.salahPlace
    if (options.salahShow === 'off' || !place) return theirs
    // Read so the timer's writes redraw this; the text itself comes from the
    // clock and these settings, so a line left by the last load never shows.
    await read($, line)
    const text = lineAt(options, place, await $.clock.now())
    if (!text) return theirs
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box gap={1}>
        <Box key="salah-line">
          <Text color={await mainColor($, options.color)} bold>{await renderArabic($, e.surface, text, arabicCache)}</Text>
        </Box>
        {theirs}
      </Box>
    )
  })

  // The terminal rises, folds to one line, then expires with the moment.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    const playing = await read($, minaret)
    if (!playing || e.props.hasSurvey || e.surface === 'desktop') return theirs
    const { Box, Button, Text } = $.ui.resolve(e)
    const stage = minaretStage(playing, await $.clock.now())
    if (stage.isGone) return theirs

    const accent = await mainColor($, options.color)
    const label = await renderArabic($, e.surface, athanText(playing.pray), arabicCache)

    const close = <Button key="salah-athan-close" label="×" plain onPress={() => closeMoment($, timer)} />
    if (stage.isFolded) return (
      <Box flexDirection="column">
        <Box key="salah-athan-row" gap={1}>
          <Text color={accent}>☾</Text><Text color={accent}>{label}</Text>{close}
        </Box>
        {theirs}
      </Box>
    )

    return (
      <Box flexDirection="column">
        {minaretRows(stage.frame).map((row, i) => (
          <Box key={`salah-minaret-${i}`} gap={2}>
            <Text color={i < ACCENT_ROWS ? accent : undefined} dimColor={i >= ACCENT_ROWS}>{row}</Text>
            {i === 0 ? close : null}
            {i === LABEL_ROW && stage.frame >= ROWS_COUNT - LABEL_ROW ? <Text color={accent}>{label}</Text> : null}
          </Box>
        ))}
        {theirs}
      </Box>
    )
  })

  // The desktop athan card: the shared card above the prompt, the athkar
  // band's size and frame, with the photo behind the call. It stays until the
  // user closes it with × or the call's window ends. The terminal never draws
  // it (the minaret is its look).
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    if (e.surface !== 'desktop' || e.props.hasSurvey) return theirs
    const shown = await read($, card)
    if (!shown) return theirs
    const now = await $.clock.now()
    if (shown.until <= now) return theirs
    photo.base64 ??= await readPhoto($)
    if (!photo.base64) return theirs
    const { Box, Client } = $.ui.resolve(e)
    const props = { isActive: true, isFolded: cardIsFolded(shown, now), now, pray: shown.pray, time: shown.time, photo: photo.base64, width: Math.round(e.props.bodyColumns * CELL_PX), card: { ch: CELL_PX, lh: LINE_PX } }
    athan.props = props

    return (
      // As the athkar band: the picture reaches a cell past the slot each side
      // and half a line above and below, over the desktop's own card.
      <Box flexDirection="column">
        <Box key="salah-athan-card" marginX={-1} marginY={-1}>
          <Client key="salah-athan" module="./athan-card.tsx" props={props} width="100%" />
        </Box>
        {theirs ?? <Box key="salah-athan-end" height={0} />}
      </Box>
    )
  })

  // The shared × closes the moment; any other left press reopens its folded card.
  on('ui.message', { element: 'salah-athan' }, async ($, e) => {
    const m = e.data
    if (!isCardMessage(m)) return {}
    if (m.act === 'size') athan.region = { columns: m.columns, rows: m.rows }
    const columns = m.act === 'pointer' ? (m.columns ?? athan.region.columns) : 0
    const rows = m.act === 'pointer' ? (m.rows ?? athan.region.rows) : 0
    const isClose = m.act === 'hide'
      || (m.act === 'pointer' && m.button === 'left' && athan.props !== undefined && columns > 0 && rows > 0 && isOnClose(athanFrame(athan.props, columns), m.x, m.y, columns, rows))
    if (isClose) await closeMoment($, timer)
    else if ((m.act === 'pointer' && m.button === 'left') || (m.act === 'key' && (m.key === 'return' || m.key === 'space'))) {
      const now = await $.clock.now()
      await update($, card, current => current && current.until > now && cardIsFolded(current, now)
        ? { ...current, isFolded: false, foldsAt: now + FOLD_MS } : current)
      await scheduleMoment($, timer)
    }

    return {}
  })

  // Until a place is saved: one line above the prompt asking for it.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    if (options.salahPlace || e.props.hasSurvey) return theirs
    if ((await read($, setupLater)) || (await $.store.get(SETUP_LATER_KEY).catch(() => undefined)) === true) return theirs
    const { Box, Button, Text } = $.ui.resolve(e)
    const done = (said: string) => void $.ui.toast(said)
    const choose = async () => {
      const city = await askCity($, guess)
      done(typeof city === 'string' ? city : await savePlace($, city, options))
    }

    return (
      <Box flexDirection="column">
        <Box key="salah-setup" gap={1}>
          <Text color={await mainColor($, options.color)}>{guess ? `Pray times for ${guess.name}?` : 'Set up pray times?'}</Text>
          {guess ? <Button key="salah-yes" label="Yes" hotkey="1" plain onPress={async () => done(await savePlace($, guess, options))} /> : null}
          <Button key="salah-city" label={guess ? 'Another city' : 'Pick city'} hotkey={guess ? '2' : '1'} plain onPress={choose} />
          <Button key="salah-later" label="Not now" hotkey={guess ? '3' : '2'} plain dimColor onPress={() => putOff($)} />
        </Box>
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

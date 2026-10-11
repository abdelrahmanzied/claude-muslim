import { atom, read, update } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'
import type { SalahMinaret, SalahWindow } from '../../../types'

import { ADJUST_MAX, isMethod, REMINDER_MAX, REMINDER_MIN, writeAdjust } from '../../config.ts'
import type { Options } from '../../config.ts'
import { CITY_MODEL, CITY_SYSTEM, cityPrompt, parseCities, parseCoordinates, type City } from './city.ts'
import { salahHelp } from './help.ts'
import { guessPlace, systemTimeZone } from './location.ts'
import { METHODS, type Prayer } from './methods.ts'
import { ENGLISH, prayerNamed } from '../../shared/pray/names.ts'
import { writePlace, type Place } from './place.ts'
import { adhanText, isInWindow, reminderText, prayerLine } from '../../shared/pray/line.ts'
import { ACCENT_ROWS, FRAME_MS, HOLD_MS, isDue, LABEL_ROW, minaretRows, ROWS_COUNT } from './minaret.ts'
import { nudge, reviewRows } from './review.ts'
import { clockText, lastPrayer, nextSalah, type Adjust } from './times.ts'
import { dayLine, methodOf } from './today.ts'

// Setup put off with Not now: for the session here, for good in $.store.
const setupLater = atom({ plugin: 'muslim', key: 'salahSetupLater' } as const, false)
const SETUP_LATER_KEY = 'salahSetupLater'
// The review form's minutes while it is open; null when closed. Kept in
// $.state so it survives the reload that saving the place causes.
const review = atom({ plugin: 'muslim', key: 'salahReview' } as const, null as Adjust | null)
const notified = atom({ plugin: 'muslim', key: 'salahNotified' } as const, null as number | null)
// The prayer whose reminder window we are in, for the thikr line to read.
const inWindow = atom({ plugin: 'muslim', key: 'salahWindow' } as const, null as SalahWindow | null)

// The minaret's frame while it plays, and the prayer time it last played for.
const minaret = atom({ plugin: 'muslim', key: 'salahMinaret' } as const, null as SalahMinaret | null)
// The prayer line drawn as its own row above the prompt; null when there is none.
const line = atom({ plugin: 'muslim', key: 'salahLine' } as const, null as string | null)
const adhanShown = atom({ plugin: 'muslim', key: 'salahAdhanShown' } as const, null as number | null)

// How often the prayer line is redrawn: every second inside the reminder
// window (the live countdown), else every 30 seconds.
const TICK_MS = 30_000
const WINDOW_TICK_MS = 1000

// The prayer line's timer and the period it runs at, and the one-shot timer
// for the moment the next reminder window opens (so the 1 s countdown starts
// on time, not on the next 30 s tick).
type Timer = {
  handle: { cancel: () => void } | undefined
  ms: number
  opens: { at: number; handle: { cancel: () => void } } | undefined
}

const HINT = 'Help: /salah help'

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

  return reply.isAnswered ? parseCities(reply.text) : 'Could not reach Claude to find the city. Try again, or type coordinates: /salah city 48.14, 11.58'
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
  if (found.length === 0) return `No city found for "${typed}". Try its English name, or latitude, longitude.`

  return (await pickCity($, typed, found)) ?? 'Not changed.'
}

// The setup question: the guessed city, or one typed under Other.
const askCity = async ($: EngineInterface, guess: Place | undefined): Promise<City | string> => {
  const question = guess
    ? `Prayer times for ${guess.name}, or type your city under Other?`
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

  return deny ? `Not changed: ${deny}` : `${city.name} · ${METHODS[methodOf(options, city)].name}`
}

// Keeps the prayer line's row in step; writes only on a change.
const setLine = async ($: EngineInterface, text: string | undefined) => {
  const now = text ?? null
  if ((await read($, line)) !== now) await update($, line, () => now)
}

// Redraws the prayer line, and shows a toast once when a prayer's reminder window starts.
// Resolves whether `now` is inside the reminder window.
const tick = async ($: EngineInterface, options: Options, place: Place, timer: Timer): Promise<boolean> => {
  const now = await $.clock.now()
  const method = methodOf(options, place)
  const next = nextSalah(place, method, options.salahAdjust, now)
  const last = lastPrayer(place, method, options.salahAdjust, now)
  const view = { mode: options.salah, reminder: options.salahReminder, isAdhan: options.salahAdhan }
  await setLine($, prayerLine(next, clockText(next.at, place.timeZone), last, now, view))
  if (options.salah !== 'off' && options.salahAdhan && isDue(last.at, now, await read($, adhanShown))) {
    await update($, adhanShown, () => last.at)
    await playMinaret($, last.prayer === 'sunrise' ? 'fajr' : last.prayer)
  }
  const text = reminderText(next, now, await read($, notified), options.salahReminder)
  if (text) {
    await update($, notified, () => next.at)
    $.ui.toast(text)
  }

  const isWindow = options.salah !== 'off' && isInWindow(next, now, options.salahReminder)
  await publishWindow($, isWindow && next.prayer !== 'sunrise' ? { prayer: next.prayer, at: next.at } : null)
  scheduleOpen($, options, place, timer, options.salah !== 'off' && !isWindow ? next.at - options.salahReminder * 60_000 : undefined, now)

  return isWindow
}

// Runs one tick at the exact moment the reminder window opens (`opensAt`,
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

// Plays the minaret once: a row every FRAME_MS from the base up, a short hold, then it goes.
const playMinaret = async ($: EngineInterface, prayer: SalahMinaret['prayer']) => {
  await update($, minaret, () => ({ prayer, frame: 1 }))
  for (let frame = 2; frame <= ROWS_COUNT; frame++) {
    $.clock.after((frame - 1) * FRAME_MS, () => void update($, minaret, () => ({ prayer, frame })))
  }
  $.clock.after(ROWS_COUNT * FRAME_MS + HOLD_MS, () => void update($, minaret, () => null))
}

// Tells the thikr line which prayer's window we are in; writes only on a change.
const publishWindow = async ($: EngineInterface, moment: SalahWindow | null) => {
  const current = await read($, inWindow)
  if (current?.prayer === moment?.prayer && current?.at === moment?.at) return
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

export const install = (on: On, options: Options) => {
  const guess = guessPlace(systemTimeZone())
  // The prayer line's timer, started on the first draw of the prompt.
  let hasTicker = false
  const timer: Timer = { handle: undefined, ms: 0, opens: undefined }
  let isLineCleared = false

  on('command.run', { command: 'salah' }, async ($, e) => {
    const [word = '', first = '', second = ''] = e.args.trim().split(/\s+/)
    const set = async (field: string, to: boolean | number | string, said: string) => {
      const { deny } = await $.config.set({ key: `muslim.${field}`, value: to })

      return { text: deny ? `Not changed: ${deny}` : said }
    }

    if (word === '') {
      const place = options.salahPlace
      if (!place) return { text: ['Prayer times are not set up yet: /salah city', '', HINT].join('\n') }
      const method = METHODS[methodOf(options, place)].name

      return {
        text: [`${place.name} · ${method} · ${options.salah}`, dayLine(options, place, await $.clock.now()), '', HINT].join('\n'),
      }
    }
    if (word === 'help') return { text: salahHelp() }
    if (word === 'reminder' && first !== '') {
      const minutes = Number(first)
      if (!Number.isInteger(minutes) || minutes < REMINDER_MIN || minutes > REMINDER_MAX) {
        return { text: `Reminder takes whole minutes from ${REMINDER_MIN} to ${REMINDER_MAX}, e.g. /salah reminder 20.` }
      }

      return set('salahReminder', minutes, `reminder ${minutes} min before each prayer`)
    }
    if (word === 'always' || word === 'reminder' || word === 'off') return set('salah', word, `salah ${word}`)
    if (word === 'adhan' && (first === 'on' || first === 'off')) return set('salahAdhan', first === 'on', `adhan ${first}`)
    if (word === 'city') {
      const typed = e.args.trim().slice('city'.length).trim()
      const city = typed === '' ? await askCity($, guess) : await cityFrom($, typed)

      return { text: typeof city === 'string' ? city : await savePlace($, city, options) }
    }
    if (word === 'method') {
      if (first === 'auto') return set('salahMethod', first, 'method auto')
      if (isMethod(first)) return set('salahMethod', first, `method ${METHODS[first].name}`)

      return { text: `Method is auto, or one of: ${Object.keys(METHODS).join(', ')}.` }
    }
    if (word === 'adjust' && first === '') {
      if (!options.salahPlace) return { text: 'Set your city first: /salah city' }
      await update($, review, () => options.salahAdjust)

      return { text: 'Check today\'s times above the prompt.' }
    }
    if (word === 'adjust') {
      const prayer = prayerNamed(first)
      const minutes = Number(second)
      if (!prayer || !Number.isInteger(minutes) || Math.abs(minutes) > ADJUST_MAX) {
        return { text: `Adjust takes a prayer and whole minutes from -${ADJUST_MAX} to +${ADJUST_MAX}, e.g. adjust asr +5.` }
      }
      const adjust = { ...options.salahAdjust, [prayer]: minutes }
      const sign = minutes > 0 ? '+' : ''

      return set('salahAdjust', writeAdjust(adjust), `${ENGLISH[prayer]} ${sign}${minutes} min`)
    }

    return { text: salahHelp() }
  })

  // The prayer line's timer, from the first time the prompt is drawn.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const place = options.salahPlace
    if (options.salah !== 'off' && place && !hasTicker) {
      hasTicker = true
      // A minaret left mid-play by a reload would stay; start clean.
      if (await read($, minaret)) await update($, minaret, () => null)
      // Drawing is pure: the first tick writes state, so it runs right after the draw.
      $.clock.after(0, () => void run($, options, place, timer))
    }
    if (!(options.salah !== 'off' && place) && !isLineCleared) {
      isLineCleared = true
      await setLine($, undefined)
      await publishWindow($, null)
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
    const move = (prayer: Prayer, step: number) => update($, review, now => (now ? nudge(now, prayer, step) : now))
    const save = async () => {
      const { deny } = await $.config.set({ key: 'muslim.salahAdjust', value: writeAdjust(draft) })
      if (deny) return void $.ui.toast(`Not changed: ${deny}`)
      await update($, review, () => null)
    }

    return (
      <Box flexDirection="column">
        <Text key="salah-review" color="claude">{`Check today's times in ${place.name} against your mosque's, then save.`}</Text>
        {rows.map(row => (
          <Box key={`salah-${row.prayer}`} gap={1}>
            <Text>{row.name}</Text>
            <Text bold>{row.time}</Text>
            <Button key={`salah-${row.prayer}-minus`} label="−" onPress={() => move(row.prayer, -1)} />
            <Text dimColor>{row.minutes}</Text>
            <Button key={`salah-${row.prayer}-plus`} label="+" onPress={() => move(row.prayer, 1)} />
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

  // The prayer line: its own row above the prompt, right-aligned. While the
  // minaret plays (about 3 s) it takes the row's place, then the line returns.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const theirs = await next(e)
    const playing = await read($, minaret)
    const text = await read($, line)
    if ((!playing && !text) || e.props.hasSurvey) return theirs
    const { Box, Text } = $.ui.resolve(e)

    if (!playing) {
      return (
        <Box flexDirection="column">
          <Box key="salah-line" justifyContent="flex-end">
            <Text color="claude">{text}</Text>
          </Box>
          {theirs}
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {minaretRows(playing.frame).map((row, i) => (
          <Box key={`salah-minaret-${i}`} gap={2}>
            <Text color={i < ACCENT_ROWS ? 'claude' : undefined} dimColor={i >= ACCENT_ROWS}>{row}</Text>
            {i === LABEL_ROW && playing.frame >= ROWS_COUNT - LABEL_ROW ? <Text color="claude">{adhanText(playing.prayer)}</Text> : null}
          </Box>
        ))}
        {theirs}
      </Box>
    )
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
          <Text color="claude">{guess ? `Prayer times for ${guess.name}?` : 'Set up prayer times?'}</Text>
          {guess ? <Button key="salah-yes" label="Yes" hotkey="1" plain onPress={async () => done(await savePlace($, guess, options))} /> : null}
          <Button key="salah-city" label={guess ? 'Another city' : 'Pick city'} hotkey={guess ? '2' : '1'} plain onPress={choose} />
          <Button key="salah-later" label="Not now" hotkey={guess ? '3' : '2'} plain dimColor onPress={() => putOff($)} />
        </Box>
        {theirs}
      </Box>
    )
  })
}

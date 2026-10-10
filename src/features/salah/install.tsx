import { atom, read, update } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'

import { ADJUST_MAX, isMethod, writeAdjust } from '../../config.ts'
import type { Options } from '../../config.ts'
import { CITY_MODEL, CITY_SYSTEM, cityPrompt, parseCities, parseCoordinates, type City } from './city.ts'
import { guessPlace, systemTimeZone } from './location.ts'
import { METHODS, type Prayer } from './methods.ts'
import { ENGLISH, prayerNamed } from './names.ts'
import { writePlace, type Place } from './place.ts'
import { notifyText, statusText } from './line.ts'
import { nudge, reviewRows } from './review.ts'
import { clockText, lastPrayer, nextPrayer, type Adjust } from './times.ts'
import { dayLine, methodOf } from './today.ts'

// Setup put off with Not now: for the session here, for good in $.store.
const setupLater = atom({ plugin: 'muslim', key: 'salahSetupLater' } as const, false)
const SETUP_LATER_KEY = 'salahSetupLater'
// The review form's minutes while it is open; null when closed. Kept in
// $.state so it survives the reload that saving the place causes.
const review = atom({ plugin: 'muslim', key: 'salahReview' } as const, null as Adjust | null)
const notified = atom({ plugin: 'muslim', key: 'salahNotified' } as const, null as number | null)

// How often the status line is redrawn.
const TICK_MS = 30_000

const HELP = [
  '/salah                         today\'s times',
  '/salah setup                   pick your city',
  '/salah on | off                next prayer under the prompt',
  '/salah notify on | off         a notification 20 minutes before each prayer',
  '/salah city <name>             your city, in any language; or latitude, longitude',
  '/salah method <name>           auto (the country\'s own), or: ' + Object.keys(METHODS).join(', '),
  '/salah adjust                  check today\'s times against your mosque\'s',
  `/salah adjust <prayer> <±min>  move one prayer by up to ${ADJUST_MAX} minutes, e.g. adjust asr +5`,
].join('\n')

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

// Redraws the status line, and notifies once in the minutes before a prayer.
const tick = async ($: EngineInterface, options: Options, place: Place) => {
  const now = await $.clock.now()
  const method = methodOf(options, place)
  const next = nextPrayer(place, method, options.salahAdjust, now)
  const last = lastPrayer(place, method, options.salahAdjust, now)
  $.ui.status(statusText(next, clockText(next.at, place.timeZone), last, now))
  if (!options.salahNotify) return
  const text = notifyText(next, now, await read($, notified))
  if (!text) return
  await update($, notified, () => next.at)
  await $.ui.notify(text, { title: 'Salah' }).catch(() => undefined)
}

const putOff = async ($: EngineInterface) => {
  await update($, setupLater, () => true)
  await $.store.set(SETUP_LATER_KEY, true)
}

export const install = (on: On, options: Options) => {
  const guess = guessPlace(systemTimeZone())
  // The status line's timer, started on the first draw of the prompt.
  let ticker: { cancel: () => void } | undefined
  let isLineCleared = false

  on('command.run', { command: 'salah' }, async ($, e) => {
    const [word = '', first = '', second = ''] = e.args.trim().split(/\s+/)
    const set = async (field: string, to: boolean | string, said: string) => {
      const { deny } = await $.config.set({ key: `muslim.${field}`, value: to })

      return { text: deny ? `Not changed: ${deny}` : said }
    }

    if (word === '') {
      const place = options.salahPlace
      if (!place) return { text: ['Prayer times are not set up yet: /salah setup', '', HELP].join('\n') }
      const method = METHODS[methodOf(options, place)].name

      return {
        text: [
          `${place.name} · ${method}${options.salah ? '' : ' · off'}`,
          dayLine(options, place, await $.clock.now()),
          '',
          HELP,
        ].join('\n'),
      }
    }
    if (word === 'on' || word === 'off') return set('salah', word === 'on', `salah ${word}`)
    if (word === 'notify' && (first === 'on' || first === 'off')) return set('salahNotify', first === 'on', `notify ${first}`)
    if (word === 'setup') {
      const city = await askCity($, guess)

      return { text: typeof city === 'string' ? city : await savePlace($, city, options) }
    }
    if (word === 'city') {
      const typed = e.args.trim().slice('city'.length).trim()
      if (typed === '') return { text: 'Type your city after it, e.g. /salah city Munich' }
      const city = await cityFrom($, typed)

      return { text: typeof city === 'string' ? city : await savePlace($, city, options) }
    }
    if (word === 'method') {
      if (first === 'auto') return set('salahMethod', first, 'method auto')
      if (isMethod(first)) return set('salahMethod', first, `method ${METHODS[first].name}`)

      return { text: `Method is auto, or one of: ${Object.keys(METHODS).join(', ')}.` }
    }
    if (word === 'adjust' && first === '') {
      if (!options.salahPlace) return { text: 'Set your city first: /salah setup' }
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

    return { text: HELP }
  })

  // The next prayer under the prompt, from the first time the prompt is drawn.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const place = options.salahPlace
    if (options.salah && place && !ticker) {
      ticker = $.clock.every(TICK_MS, () => void tick($, options, place))
      await tick($, options, place)
    }
    if (!(options.salah && place) && !isLineCleared) {
      isLineCleared = true
      $.ui.status(undefined)
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

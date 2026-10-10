import { atom, read, update } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'

import { ADJUST_MAX, isMethod, writeAdjust } from '../../config.ts'
import type { Options } from '../../config.ts'
import { CITY_MODEL, CITY_SYSTEM, cityPrompt, parseCities, parseCoordinates, type City } from './city.ts'
import { guessPlace, systemTimeZone } from './location.ts'
import { METHODS } from './methods.ts'
import { ENGLISH, prayerNamed } from './names.ts'
import { writePlace, type Place } from './place.ts'
import { dayLine, methodOf } from './today.ts'

// Setup put off with Not now: for the session here, for good in $.store.
const setupLater = atom({ plugin: 'muslim', key: 'salahSetupLater' } as const, false)
const SETUP_LATER_KEY = 'salahSetupLater'

const HELP = [
  '/salah                         today\'s times',
  '/salah setup                   pick your city',
  '/salah on | off                next prayer under the prompt',
  '/salah city <name>             your city, in any language; or latitude, longitude',
  '/salah method <name>           auto (the country\'s own), or: ' + Object.keys(METHODS).join(', '),
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

// Saves the city; the module reloads with it.
const savePlace = async ($: EngineInterface, city: City, options: Options): Promise<string> => {
  const { deny } = await $.config.set({ key: 'muslim.salahPlace', value: writePlace(city) })

  return deny ? `Not changed: ${deny}` : `${city.name} · ${METHODS[methodOf(options, city)].name}`
}

const putOff = async ($: EngineInterface) => {
  await update($, setupLater, () => true)
  await $.store.set(SETUP_LATER_KEY, true)
}

export const install = (on: On, options: Options) => {
  const guess = guessPlace(systemTimeZone())

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

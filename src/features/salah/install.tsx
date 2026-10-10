import type { EngineInterface, On } from 'claude-code'

import { ADJUST_MAX, isMethod, writeAdjust } from '../../config.ts'
import type { Options } from '../../config.ts'
import { CITY_MODEL, CITY_SYSTEM, cityPrompt, parseCities, parseCoordinates, type City } from './city.ts'
import { guessPlace, systemTimeZone } from './location.ts'
import { METHODS } from './methods.ts'
import { ENGLISH, prayerNamed } from './names.ts'
import { writePlace } from './place.ts'
import { dayLine, methodOf } from './today.ts'

const HELP = [
  '/salah                         today\'s times',
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

export const install = (on: On, options: Options) => {
  on('command.run', { command: 'salah' }, async ($, e) => {
    const [word = '', first = '', second = ''] = e.args.trim().split(/\s+/)
    const set = async (field: string, to: boolean | string, said: string) => {
      const { deny } = await $.config.set({ key: `muslim.${field}`, value: to })

      return { text: deny ? `Not changed: ${deny}` : said }
    }

    if (word === '') {
      const place = options.salahPlace
      if (!place) return { text: ['Prayer times are not set up yet.', '', HELP].join('\n') }
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
    if (word === 'city') {
      const typed = e.args.trim().slice('city'.length).trim()
      if (typed === '') return { text: 'Type your city after it, e.g. /salah city Munich' }
      const found = await findCities($, typed)
      if (typeof found === 'string') return { text: found }
      if (found.length === 0) return { text: `No city found for "${typed}". Try its English name, or latitude, longitude.` }
      const city = await pickCity($, typed, found)
      if (!city) return { text: 'Not changed.' }

      return set('salahPlace', writePlace(city), `${city.name} · ${METHODS[methodOf(options, city)].name}`)
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
}

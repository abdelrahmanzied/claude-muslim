import type { On } from 'claude-code'

import { ADJUST_MAX, isMethod, writeAdjust } from '../../config.ts'
import type { Options } from '../../config.ts'
import { METHODS } from './methods.ts'
import { ENGLISH, prayerNamed } from './names.ts'
import { dayLine, methodOf } from './today.ts'

const HELP = [
  '/salah                         today\'s times',
  '/salah on | off                next prayer under the prompt',
  '/salah method <name>           auto (the country\'s own), or: ' + Object.keys(METHODS).join(', '),
  `/salah adjust <prayer> <±min>  move one prayer by up to ${ADJUST_MAX} minutes, e.g. adjust asr +5`,
].join('\n')

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

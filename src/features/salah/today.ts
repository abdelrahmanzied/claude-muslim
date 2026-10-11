// Today's times for the saved place, as the command and the lines show them.

import type { Options } from '../../config.ts'
import { REMINDER_MAX, REMINDER_MIN } from '../../config.ts'
import { METHODS, methodFor, PRAYERS, type MethodId } from './methods.ts'
import { ENGLISH } from '../../shared/pray/names.ts'
import type { Place } from './place.ts'
import { clockText, nextSalah, timesOn } from './times.ts'

// The method in effect: the one set, or the place's country's own.
export const methodOf = (options: Options, place: Place): MethodId =>
  options.salahMethod === 'auto' ? methodFor(place.country) : options.salahMethod

// Today's times as a table, the next prayer marked; a moved prayer shows its minutes.
export const timesTable = (options: Options, place: Place, at: number): string => {
  const method = methodOf(options, place)
  const times = timesOn(place, method, options.salahAdjust, at)
  const next = nextSalah(place, method, options.salahAdjust, at)
  const rows = PRAYERS.map(prayer => {
    const moved = options.salahAdjust[prayer]
    const time = clockText(times[prayer], place.timeZone) + (moved === 0 ? '' : ` (${moved > 0 ? '+' : ''}${moved} min)`)
    const name = next.at === times[prayer] ? `**${ENGLISH[prayer]}** · next` : ENGLISH[prayer]

    return `| ${name} | ${time} |`
  })

  return ['| Prayer | Time |', '| --- | --- |', ...rows].join('\n')
}

// The settings in effect, each with the command that changes it.
export const settingsTable = (options: Options, place: Place): string => {
  const method = METHODS[methodOf(options, place)].name + (options.salahMethod === 'auto' ? ' (auto)' : '')
  const moved = PRAYERS.filter(prayer => options.salahAdjust[prayer] !== 0)
  const rows: readonly (readonly [string, string, string])[] = [
    ['City', place.name, '/salah city'],
    ['Method', method, '/salah method <name>'],
    ['Prayer line', options.salah, '/salah always` · `reminder` · `off'],
    ['Reminder', `${options.salahReminder} min before`, `/salah reminder <${REMINDER_MIN}-${REMINDER_MAX}>`],
    ['Athan', options.salahAthan ? 'on' : 'off', '/salah athan on` · `off'],
    ['Adjust', moved.length === 0 ? 'none' : moved.map(prayer => `${ENGLISH[prayer]} ${options.salahAdjust[prayer] > 0 ? '+' : ''}${options.salahAdjust[prayer]}`).join(', '), '/salah adjust'],
  ]

  return ['| Setting | Value | Change with |', '| --- | --- | --- |', ...rows.map(([name, value, command]) => `| ${name} | ${value} | \`${command}\` |`)].join('\n')
}

// Today's times for the saved place, as the command and the lines show them.

import type { Options, SalahMode } from '../../config.ts'
import { REMINDER_MAX, REMINDER_MIN } from '../../config.ts'
import { METHODS, methodFor, PRAYS, type MethodId } from './methods.ts'
import { ENGLISH } from '../../shared/pray/names.ts'
import type { Place } from './place.ts'
import { clockText, nextSalah, timesOn } from './times.ts'

// The method in effect: the one set, or the place's country's own.
export const methodOf = (options: Options, place: Place): MethodId =>
  options.salahMethod === 'auto' ? methodFor(place.country) : options.salahMethod

// Today's times as a table, the next pray marked; a moved pray shows its minutes.
export const timesTable = (options: Options, place: Place, at: number): string => {
  const method = methodOf(options, place)
  const times = timesOn(place, method, options.salahAdjust, at)
  const next = nextSalah(place, method, options.salahAdjust, at)
  const rows = PRAYS.map(pray => {
    const moved = options.salahAdjust[pray]
    const time = clockText(times[pray], place.timeZone) + (moved === 0 ? '' : ` (${moved > 0 ? '+' : ''}${moved} min)`)
    const name = next.at === times[pray] ? `**${ENGLISH[pray]}** · next` : ENGLISH[pray]

    return `| ${name} | ${time} |`
  })

  return ['| Pray | Time |', '| --- | --- |', ...rows].join('\n')
}

// What each pray line mode shows, for the settings table and the replies.
export const lineText = (mode: SalahMode, minutes: number): string =>
  `\`${mode}\` — ` + (mode === 'always' ? 'next pray all day' : mode === 'before' ? `only ${minutes} min before a pray` : 'hidden')

// The settings in effect, each with the command that changes it.
export const settingsTable = (options: Options, place: Place): string => {
  const method = METHODS[methodOf(options, place)].name + (options.salahMethod === 'auto' ? ' (auto)' : '')
  const moved = PRAYS.filter(pray => options.salahAdjust[pray] !== 0)
  const rows: readonly (readonly [string, string, string])[] = [
    ['City', place.name, '/salah city'],
    ['Method', method, '/salah method <name>'],
    ['Pray line', lineText(options.salah, options.salahReminder), '/salah line always` · `before` · `off'],
    ['Reminder', `${options.salahReminder} min before a pray`, `/salah reminder <${REMINDER_MIN}-${REMINDER_MAX}>`],
    ['Athan', options.salahAthan ? 'on' : 'off', '/salah athan on` · `off'],
    ['Adjust', moved.length === 0 ? 'none' : moved.map(pray => `${ENGLISH[pray]} ${options.salahAdjust[pray] > 0 ? '+' : ''}${options.salahAdjust[pray]}`).join(', '), '/salah adjust'],
  ]

  return ['| Setting | Value | Change with |', '| --- | --- | --- |', ...rows.map(([name, value, command]) => `| ${name} | ${value} | \`${command}\` |`)].join('\n')
}

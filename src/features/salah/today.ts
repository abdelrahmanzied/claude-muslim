// Today's times for the saved place, as the command and the lines show them.

import { statusTable } from '../../table.ts'
import { ALWAYS_COUNTDOWN, type Options, type Show } from '../../config.ts'
import { METHODS, methodFor, PRAYS, type MethodId } from './methods.ts'
import { ENGLISH } from '../../shared/pray/names.ts'
import type { Place } from './place.ts'
import { prayLine } from '../../shared/pray/line.ts'
import { clockText, lastPray, nextSalah, timesOn } from './times.ts'

// The method in effect: the one set, or the place's country's own.
export const methodOf = (options: Options, place: Place): MethodId =>
  options.salahMethod === 'auto' ? methodFor(place.country) : options.salahMethod

// The pray line at `now` for these settings; undefined when it is empty.
export const lineAt = (options: Options, place: Place, now: number): string | undefined => {
  const method = methodOf(options, place)
  const next = nextSalah(place, method, options.salahAdjust, now)
  const last = lastPray(place, method, options.salahAdjust, now)

  return prayLine(next, clockText(next.at, place.timeZone), last, now, { show: options.salahShow, isAthan: options.salahAthan })
}

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

// What a show setting does, for the settings table and the replies.
export const showText = (show: Show): string =>
  show === 'always' ? `\`always\` — next pray all day, counting down its last ${ALWAYS_COUNTDOWN} min`
    : show === 'off' ? '`off` — hidden'
    : `\`${show}\` — only the ${show} min before a pray, counting down`

// The settings in effect, each with what it is.
export const settingsTable = (options: Options, place: Place): string => {
  const method = METHODS[methodOf(options, place)].name + (options.salahMethod === 'auto' ? ' (auto)' : '')
  const moved = PRAYS.filter(pray => options.salahAdjust[pray] !== 0)
  return statusTable([
    ['City', 'Where the times are calculated for', place.name],
    ['Method', 'How the times are calculated', method],
    ['Show', 'The next pray under the prompt', showText(options.salahShow)],
    ['Athan', 'حان وقت صلاة … when a pray comes in', options.salahAthan ? 'on' : 'off'],
    ['Adjust', 'Minutes moved to match your mosque', moved.length === 0 ? 'none' : moved.map(pray => `${ENGLISH[pray]} ${options.salahAdjust[pray] > 0 ? '+' : ''}${options.salahAdjust[pray]}`).join(', ')],
  ])
}

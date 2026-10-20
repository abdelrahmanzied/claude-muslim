// What the Muslim pane shows of salah: today's five prays for the saved place
// and the next one. Pure: it reads only the settings and the clock it is given.

import type { Options } from '../../config.ts'
import type { PanelPray, PanelSalah } from '../../shared/panel/signal.ts'
import { clockText, lastPray, nextSalah, timesOn } from './times.ts'
import { methodOf } from './today.ts'
import { localTime } from './clock.ts'

const FIVE: readonly PanelPray[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

// null while no place is set. The next pray after Isha is tomorrow's Fajr.
export const panelSalah = (options: Options, now: number): PanelSalah | null => {
  const place = options.salahPlace
  if (!place) return null
  const method = methodOf(options, place)
  const next = nextSalah(place, method, options.salahAdjust, now)
  const last = lastPray(place, method, options.salahAdjust, now)
  const isha = next.pray === 'isha' ? next : last.pray === 'isha' ? last : null
  // A post-midnight Isha still appears in its calculated day's five rows.
  const anchor = isha && localTime(isha.at, place.timeZone).hour < 12 ? isha.at - 12 * 3600_000 : now
  const times = timesOn(place, method, options.salahAdjust, anchor)
  const row = (pray: PanelPray, at: number) => ({ pray, at, clock: clockText(at, place.timeZone) })

  return {
    city: place.name,
    prays: FIVE.map(pray => row(pray, times[pray])),
    next: row(next.pray as PanelPray, next.at),
    isAthan: options.salahAthan,
  }
}

// A day's pray times for a place, its method and the user's own minutes,
// computed by the vendored athan library; and which pray comes next.

import { CalculationParameters, Coordinates, HighLatitudeRule, PolarCircleResolution, PrayerTimes } from './athan/Athan.ts'
import type { SalahAthkarTimes, SalahLast } from '../../../types'
import { hijriMonth, localTime } from './clock.ts'
import { METHODS, PRAYS, type MethodId, type Pray } from './methods.ts'

export type Adjust = Record<Pray, number>

export const NO_ADJUST: Adjust = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }

export type Where = { latitude: number; longitude: number; timeZone: string }

// Each pray's time, ms since epoch.
export type DayTimes = Record<Pray, number>

const DAY_MS = 24 * 60 * 60 * 1000

export const paramsFor = (method: MethodId, adjust: Adjust, isRamadan: boolean, coordinates: Coordinates) => {
  const m = METHODS[method]
  const ishaMinutes = isRamadan && m.ramadanIshaMinutes ? m.ramadanIshaMinutes : m.ishaMinutes
  const params = new CalculationParameters('Other', m.fajrAngle, m.ishaAngle ?? 0, ishaMinutes ?? 0)
  params.methodAdjustments = { ...NO_ADJUST, ...m.adjust }
  params.adjustments = { ...adjust }
  params.highLatitudeRule = HighLatitudeRule.recommended(coordinates)
  params.polarCircleResolution = PolarCircleResolution.AqrabYaum

  return params
}

// The pray times of the local day that `at` falls on in the place's time zone.
export const timesOn = (place: Where, method: MethodId, adjust: Adjust, at: number): DayTimes => {
  const { year, month, day } = localTime(at, place.timeZone)
  const coordinates = new Coordinates(place.latitude, place.longitude)
  const isRamadan = hijriMonth(at, place.timeZone) === 9
  const times = new PrayerTimes(coordinates, new Date(year, month - 1, day), paramsFor(method, adjust, isRamadan, coordinates))

  return {
    fajr: times.fajr.getTime(),
    sunrise: times.sunrise.getTime(),
    dhuhr: times.dhuhr.getTime(),
    asr: times.asr.getTime(),
    maghrib: times.maghrib.getTime(),
    isha: times.isha.getTime(),
  }
}

// The next pray after `at` (sunrise included), today's or tomorrow's Fajr.
export const nextPray = (place: Where, method: MethodId, adjust: Adjust, at: number): { pray: Pray; at: number } => {
  const today = timesOn(place, method, adjust, at)
  const pray = PRAYS.find(name => today[name] > at)
  if (pray) return { pray, at: today[pray] }

  return { pray: 'fajr', at: timesOn(place, method, adjust, at + DAY_MS).fajr }
}

// The next of the five prays after `at`: nextPray without sunrise.
export const nextSalah = (place: Where, method: MethodId, adjust: Adjust, at: number): { pray: Pray; at: number } => {
  const next = nextPray(place, method, adjust, at)
  if (next.pray !== 'sunrise') return next

  return nextPray(place, method, adjust, next.at)
}

// The most recent pray at or before `at` (sunrise excluded), today's or yesterday's Isha.
export const lastPray = (place: Where, method: MethodId, adjust: Adjust, at: number): { pray: Pray; at: number } => {
  const today = timesOn(place, method, adjust, at)
  const pray = [...PRAYS].reverse().find(name => name !== 'sunrise' && today[name] <= at)
  if (pray) return { pray, at: today[pray] }

  return { pray: 'isha', at: timesOn(place, method, adjust, at - DAY_MS).isha }
}

// HH:MM in the place's time zone, 24-hour.
export const clockText = (at: number, timeZone: string): string => {
  const { hour, minute } = localTime(at, timeZone)

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// Today's last obligatory prayer only: before Fajr there is no last prayer today.
export const lastSalahToday = (place: Where, method: MethodId, adjust: Adjust, at: number): SalahLast | null => {
  const times = timesOn(place, method, adjust, at)
  const pray = [...PRAYS].reverse().find(name => name !== 'sunrise' && times[name] <= at)
  return pray && pray !== 'sunrise' ? { pray, at: times[pray] } : null
}

// Bounds for the place's current calendar day. Calendar arithmetic at noon keeps
// adjacent dates correct across DST (a local day need not last 24 hours).
export const athkarTimes = (place: Where, method: MethodId, adjust: Adjust, at: number): SalahAthkarTimes => {
  const { year, month, day } = localTime(at, place.timeZone)
  const key = (offset: number) => {
    const d = new Date(year, month - 1, day + offset, 12)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const today = timesOn(place, method, adjust, at)
  // Pick a point well inside tomorrow in the place's zone, including DST days.
  const tomorrow = at + (36 - localTime(at, place.timeZone).hour) * 3600_000
  return { day: key(0), previousDay: key(-1), fajr: today.fajr, maghrib: today.maghrib, nextFajr: timesOn(place, method, adjust, tomorrow).fajr }
}

// A day's prayer times for a place, its method and the user's own minutes,
// computed by adhan; and which prayer comes next.

import { CalculationParameters, Coordinates, HighLatitudeRule, PolarCircleResolution, PrayerTimes } from './athan/Adhan.ts'
import { hijriMonth, localTime } from './clock.ts'
import { METHODS, PRAYERS, type MethodId, type Prayer } from './methods.ts'

export type Adjust = Record<Prayer, number>

export const NO_ADJUST: Adjust = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }

export type Where = { latitude: number; longitude: number; timeZone: string }

// Each prayer's time, ms since epoch.
export type DayTimes = Record<Prayer, number>

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

// The prayer times of the local day that `at` falls on in the place's time zone.
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

// The next prayer after `at` (sunrise included), today's or tomorrow's Fajr.
export const nextPrayer = (place: Where, method: MethodId, adjust: Adjust, at: number): { prayer: Prayer; at: number } => {
  const today = timesOn(place, method, adjust, at)
  const prayer = PRAYERS.find(name => today[name] > at)
  if (prayer) return { prayer, at: today[prayer] }

  return { prayer: 'fajr', at: timesOn(place, method, adjust, at + DAY_MS).fajr }
}

// The next of the five prayers after `at`: nextPrayer without sunrise.
export const nextSalah = (place: Where, method: MethodId, adjust: Adjust, at: number): { prayer: Prayer; at: number } => {
  const next = nextPrayer(place, method, adjust, at)
  if (next.prayer !== 'sunrise') return next

  return nextPrayer(place, method, adjust, next.at)
}

// The most recent prayer at or before `at` (sunrise excluded), today's or yesterday's Isha.
export const lastPrayer = (place: Where, method: MethodId, adjust: Adjust, at: number): { prayer: Prayer; at: number } => {
  const today = timesOn(place, method, adjust, at)
  const prayer = [...PRAYERS].reverse().find(name => name !== 'sunrise' && today[name] <= at)
  if (prayer) return { prayer, at: today[prayer] }

  return { prayer: 'isha', at: timesOn(place, method, adjust, at - DAY_MS).isha }
}

// HH:MM in the place's time zone, 24-hour.
export const clockText = (at: number, timeZone: string): string => {
  const { hour, minute } = localTime(at, timeZone)

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

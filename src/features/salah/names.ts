// Prayer names: English transliteration for commands and help, Arabic for
// the lines shown with Claude.

import type { Prayer } from './methods.ts'

export const ENGLISH: Readonly<Record<Prayer, string>> = {
  fajr: 'Fajr',
  sunrise: 'Sunrise',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
}

export const ARABIC: Readonly<Record<Prayer, string>> = {
  fajr: 'الفجر',
  sunrise: 'الشروق',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
}

// A prayer named in a command, in any case: `asr`, `Asr`.
export const prayerNamed = (word: string): Prayer | undefined =>
  (Object.keys(ENGLISH) as Prayer[]).find(prayer => prayer === word.toLowerCase())

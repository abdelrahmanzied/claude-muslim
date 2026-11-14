// Pray names: English transliteration for commands and help, Arabic for
// the lines shown with Claude.

export type Pray = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'

export type Fard = Exclude<Pray, 'sunrise'>

export const ENGLISH: Readonly<Record<Pray, string>> = {
  fajr: 'Fajr',
  sunrise: 'Sunrise',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
}

export const ARABIC: Readonly<Record<Pray, string>> = {
  fajr: 'الفجر',
  sunrise: 'الشروق',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
}

// A pray named in a command, in any case: `asr`, `Asr`.
export const prayNamed = (word: string): Pray | undefined =>
  (Object.keys(ENGLISH) as Pray[]).find(pray => pray === word.toLowerCase())

// Jumu'ah: on the device's local Friday the Dhuhr slot is named الجمعة / Jumu'ah.
// Every place a pray name is shown goes through these two, with the pray's time.
export const isFriday = (at: number): boolean => new Date(at).getDay() === 5

export const JUMUAH = { english: "Jumu'ah", arabic: 'الجمعة' } as const

export const englishName = (pray: Pray, at: number): string => (pray === 'dhuhr' && isFriday(at) ? JUMUAH.english : ENGLISH[pray])

export const arabicName = (pray: Pray, at: number): string => (pray === 'dhuhr' && isFriday(at) ? JUMUAH.arabic : ARABIC[pray])

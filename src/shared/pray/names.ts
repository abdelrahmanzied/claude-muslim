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

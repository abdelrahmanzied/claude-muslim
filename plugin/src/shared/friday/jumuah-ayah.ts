// The verse the Jumu'ah athan card shows (desktop and terminal): Surat al-Jumu'ah, verse 9, authored data.
// Letter for letter from the Tanzil Quran text, Simple edition with tashkeel and its stop sign, fetched
// from api.alquran.cloud (`quran-simple`, 62:9) and compared with the `quran-uthmani` edition of the same
// verse (same words, only the Uthmani spelling differs). Never generated or reworded; display may strip
// the tashkeel (the `tashkeel` setting on the desktop, always on a terminal), never change a word.
// Pure: no $.

import { isFriday } from '../pray/names.ts'
import type { Pray } from '../pray/names.ts'

export const JUMUAH_AYAH = 'يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا نُودِيَ لِلصَّلَاةِ مِنْ يَوْمِ الْجُمُعَةِ فَاسْعَوْا إِلَىٰ ذِكْرِ اللَّهِ وَذَرُوا الْبَيْعَ ۚ ذَٰلِكُمْ خَيْرٌ لَكُمْ إِنْ كُنْتُمْ تَعْلَمُونَ'

// The reference under it: the surah's name, then the verse number in Arabic-Indic digits.
export const JUMUAH_REF = 'سورة الجمعة · الآية ٩'

// The verse inside its ornate brackets, as the card draws it: U+FD3F opens it (shown at the right) and U+FD3E closes it.
export const ayahInBrackets = (text: string): string => `\uFD3F${text}\uFD3E`

// Only Dhuhr on a device Friday (Jumu'ah) shows it; every other prayer and day has none.
export const jumuahVerse = (pray: Pray, at: number): { text: string; ref: string } | null =>
  pray === 'dhuhr' && isFriday(at) ? { text: JUMUAH_AYAH, ref: JUMUAH_REF } : null

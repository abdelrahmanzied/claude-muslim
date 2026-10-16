// The athkar said after the salam of each obligatory prayer. The text is
// transcribed from Hisn al-Muslim, chapter 25 (https://sunnah.com/hisn:66 to
// hisn:72); the order follows Sheikh Ibn Baz's fatwa
// (https://binbaz.org.sa/fatwas/9879). Authored text with tashkeel: display may
// strip the marks, never change the words.

import type { Fard } from '../../shared/pray/names.ts'
export type { Fard } from '../../shared/pray/names.ts'
import { ATHKAR } from './data.ts'

export type AfterSalahThikr = {
  // The Hisn al-Muslim number; a suffix tells apart the parts of one number.
  id: string
  // How many times it is said after every prayer.
  times: number
  // A different count after these prayers.
  timesAfter?: Partial<Record<Fard, number>>
  // Said only after these prayers.
  only?: readonly Fard[]
  text: string
  // Where it comes from, when it is the Quran.
  note?: string
}

// Ayat al-Kursi and the three Quls are the same authored text as in the
// morning and evening athkar.
const same = (id: string): Pick<AfterSalahThikr, 'text' | 'note'> => {
  const thikr = ATHKAR.find((each) => each.id === id)
  if (!thikr) throw new Error(`athkar: no thikr ${id}`)
  return { text: thikr.text, note: thikr.note }
}

const QULS_THRICE: Partial<Record<Fard, number>> = { fajr: 3, maghrib: 3 }

export const AFTER_SALAH: readonly AfterSalahThikr[] = [
  { id: "66-istighfar", times: 3, text: "أَسْتَغْفِرُ اللَّهَ" },
  { id: "66-salam", times: 1, text: "اللَّهُمَّ أَنْتَ السَّلَامُ، وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ" },
  { id: "67", times: 1, text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ" },
  { id: "68", times: 1, text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ، لَا إِلَهَ إِلَّا اللَّهُ، وَلَا نَعْبُدُ إِلَّا إِيَّاهُ، لَهُ النِّعْمَةُ وَلَهُ الْفَضْلُ وَلَهُ الثَّنَاءُ الْحَسَنُ، لَا إِلَهَ إِلَّا اللَّهُ مُخْلِصِينَ لَهُ الدِّينَ وَلَوْ كَرِهَ الْكَافِرُونَ" },
  { id: "72", times: 10, only: ['fajr', 'maghrib'], text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، يُحْيِي وَيُمِيتُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ" },
  { id: "69-tasbih", times: 33, text: "سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَاللَّهُ أَكْبَرُ" },
  { id: "69-tahlil", times: 1, text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ" },
  { id: "71", times: 1, ...same("75") },
  { id: "70-ikhlas", times: 1, timesAfter: QULS_THRICE, ...same("76-ikhlas") },
  { id: "70-falaq", times: 1, timesAfter: QULS_THRICE, ...same("76-falaq") },
  { id: "70-nas", times: 1, timesAfter: QULS_THRICE, ...same("76-nas") },
]

// The athkar after one prayer, each with its count there.
export const afterSalah = (prayer: Fard | null): readonly AfterSalahThikr[] =>
  AFTER_SALAH
    .filter((thikr) => !thikr.only || (prayer !== null && thikr.only.includes(prayer)))
    .map((thikr) => ({ ...thikr, times: (prayer === null ? undefined : thikr.timesAfter?.[prayer]) ?? thikr.times }))

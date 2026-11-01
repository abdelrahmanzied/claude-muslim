// Friday on the device's local day, shared by the features that change on it
// (the thikr line's salawat) and by the friday feature itself. Pure: no $.

export { isFriday } from '../pray/names.ts'
import { isFriday } from '../pray/names.ts'

// Surat al-Kahf is surah 18: the Friday shortcuts (the reminder card, the Quran card's button) play it.
export const KAHF_SURAH = 18

// The device's local day as `YYYY-MM-DD`: the key a once-per-Friday flag is kept under.
export const dayKey = (at: number): string => {
  const d = new Date(at)

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Friday salawat: on Friday from Fajr (the whole device day when no place is saved).
export const isSalawatTime = (enabled: boolean, now: number, fajr: number | null): boolean =>
  enabled && isFriday(now) && (fajr === null || now >= fajr)

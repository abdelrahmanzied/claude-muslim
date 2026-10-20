import { QURAN_SUPPORT } from './reciter-support.ts'
import type { RecordingSupport } from './support.ts'

type SupportCatalog = Readonly<Record<string, Pick<RecordingSupport, 'unavailable'>>>
export const UNAVAILABLE_ERROR = 'هذه السورة غير متاحة لهذا القارئ. اختر سورة أخرى أو قارئًا آخر.'

export function unavailableSurahs(key: string, catalog: SupportCatalog = QURAN_SUPPORT): number[] {
  return Object.keys(catalog[key]?.unavailable ?? {}).map(Number).filter(s => Number.isInteger(s) && s >= 1 && s <= 114).sort((a, b) => a - b)
}
export function isAvailable(key: string, surah: number, catalog: SupportCatalog = QURAN_SUPPORT): boolean {
  return Number.isInteger(surah) && surah >= 1 && surah <= 114 && catalog[key]?.unavailable[surah] === undefined
}
// Navigation never wraps, including across a run of unavailable surahs.
export function nextAvailable(key: string, surah: number, direction: 1 | -1, catalog: SupportCatalog = QURAN_SUPPORT): number | null {
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) return null
  for (let candidate = surah + direction; candidate >= 1 && candidate <= 114; candidate += direction) {
    if (isAvailable(key, candidate, catalog)) return candidate
  }
  return null
}
export function nearestAvailable(key: string, surah: number, catalog: SupportCatalog = QURAN_SUPPORT): number | null {
  return isAvailable(key, surah, catalog) ? surah : nextAvailable(key, surah, 1, catalog) ?? nextAvailable(key, surah, -1, catalog)
}
export function unavailableNote(count: number): string {
  if (count === 0) return ''
  if (count === 1) return 'سورة واحدة غير متاحة لهذا القارئ'
  if (count === 2) return 'سورتان غير متاحتين لهذا القارئ'
  const digits = String(count).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]!)
  return `${digits} ${count <= 10 ? 'سور' : 'سورة'} غير متاحة لهذا القارئ`
}

export type Reciter = { key: string; name: string; label: string; server: string }
export type Surah = { id: number; name: string }
export type Catalog = { reciters: Reciter[]; surahs: Surah[] }
export const DEFAULT_SERVER = 'https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/'

const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}
const id = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0

export function filterReciters(value: unknown): Reciter[] {
  const rows = record(value).reciters
  if (!Array.isArray(rows)) return []
  const choices: Reciter[] = []
  for (const raw of rows) {
    const r = record(raw)
    if (!id(r.id) || typeof r.name !== 'string' || !Array.isArray(r.moshaf)) continue
    for (const rawM of r.moshaf) {
      const m = record(rawM)
      if (!id(m.id) || m.rewaya_id !== 1 || m.surah_total !== 114 || typeof m.name !== 'string' || typeof m.server !== 'string' || !/^https:\/\/[a-z0-9.-]+\/[a-z0-9/_-]*\/$/i.test(m.server)) continue
      const suffix = m.name.includes(' - ') ? m.name.split(' - ').slice(1).join(' - ') : m.name
      const key = `${r.id}:${m.id}`
      if (!choices.some(c => c.key === key)) choices.push({ key, name: r.name, label: `${r.name} — ${suffix}`, server: m.server })
    }
  }
  return choices
}

export function readSurahs(value: unknown): Surah[] {
  const rows = record(value).suwar
  if (!Array.isArray(rows)) return []
  const surahs = rows.map(record).filter(r => id(r.id) && r.id <= 114 && typeof r.name === 'string').map(r => ({ id: r.id as number, name: r.name as string })).sort((a, b) => a.id - b.id)
  return surahs.length === 114 && surahs.every((s, i) => s.id === i + 1) ? surahs : []
}

export const defaultReciter = (catalog: Catalog): Reciter => catalog.reciters.find(r => r.server === DEFAULT_SERVER) ?? catalog.reciters[0]!
export function audioUrl(reciter: Reciter, surah: number): string {
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) throw new Error('Surah must be 1–114')
  return `${reciter.server}${String(surah).padStart(3, '0')}.mp3`
}

export const normalizeName = (text: string, stripArticle = true): string => text.normalize('NFKC').replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ء/g, '').replace(/\s/g, '').replace(/ال/g, article => stripArticle ? '' : article).toLowerCase()
export function matchSurah(text: string, surahs: readonly Surah[]): Surah | undefined {
  if (/^\d+$/.test(text)) return surahs.find(s => s.id === Number(text))
  const name = normalizeName(text)
  return name ? surahs.find(s => normalizeName(s.name) === name) : undefined
}
export function matchReciter(text: string, reciters: readonly Reciter[]): Reciter | undefined {
  if (/^\d+$/.test(text)) return reciters[Number(text) - 1]
  const name = normalizeName(text)
  const exact = reciters.filter(r => normalizeName(r.label) === name || normalizeName(r.name) === name)
  // A reciter with multiple recordings needs the full label or its number.
  return exact.length === 1 ? exact[0] : undefined
}

// Keep ال in substring searches: removing it would turn صالح into صح.
const searchName = (text: string): string => normalizeName(text, false)
export function searchReciters(query: string, reciters: readonly Reciter[]): Reciter[] {
  const digits = query.trim().replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
  if (/^\d+$/.test(digits)) return reciters[Number(digits) - 1] ? [reciters[Number(digits) - 1]!] : []
  const name = searchName(query)
  return reciters.filter(r => !name || searchName(r.name).includes(name) || searchName(r.label).includes(name))
}
export function searchSurahs(query: string, surahs: readonly Surah[]): Surah[] {
  const digits = query.trim().replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
  if (/^\d+$/.test(digits)) return surahs.filter(s => s.id === Number(digits))
  const name = searchName(query)
  return surahs.filter(s => !name || searchName(s.name).includes(name))
}

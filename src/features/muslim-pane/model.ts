// What the Muslim pane shows, as plain data the Client draws: pure, no $.
// The three cards read what the features connect (src/shared/panel); a feature
// that is off or not drawn yet leaves its card with a quiet note instead.

import { NO_FOLDS, type Folds } from './layout.ts'
import type { Accent } from '../../shared/color/index.ts'
import { ARABIC } from '../../shared/pray/names.ts'
import { arabicDigits } from '../../shared/pray/line.ts'
import type { PanelAthkar, PanelQuran, PanelSalah } from '../../shared/panel/signal.ts'

export type PrayState = 'done' | 'next' | 'upcoming'
export type PrayerRow = { name: string; time: string; state: PrayState }

export type PrayerCard = {
  isSet: boolean
  city: string
  nextName: string
  nextTime: string
  until: string
  rows: PrayerRow[]
  isAthan: boolean
}
export type QuranCard = (PanelQuran & { isAvailable: true }) | { isAvailable: false }
export type AthkarCard = { isAvailable: false } | { isAvailable: true; isEvening: boolean; title: string; fraction: string; progress: number; isDone: boolean }

export type PaneModel = {
  width: number
  color: Accent
  theme?: 'light' | 'dark'
  folds: Folds
  prayer: PrayerCard
  quran: QuranCard
  athkar: AthkarCard
}

export const PANE_MIN_WIDTH = 240
export const PANE_MAX_WIDTH = 1200
export const CELL_PX = 8.4
// A closing or expanding pane can report zero or non-finite sizes; none may reach an Svg.
export const widthOf = (columns: unknown, fallback = 360): number =>
  typeof columns === 'number' && Number.isFinite(columns) && columns > 0 ? Math.max(PANE_MIN_WIDTH, Math.min(PANE_MAX_WIDTH, Math.round(columns * CELL_PX))) : fallback

// `in 1h 12m`, `in 12m`, `in <1m`: English chrome beside the Arabic time, as designed.
export const untilText = (ms: number): string => {
  if (!Number.isFinite(ms) || ms < 60_000) return 'in <1m'
  const minutes = Math.floor(ms / 60_000)
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `in ${hours}h ${minutes % 60}m` : `in ${minutes}m`
}

// Done before now; next is the one the salah feature says is next, if it is among today's;
// after Isha every row is done and the next is tomorrow's Fajr.
export const prayerRows = (salah: PanelSalah, now: number): PrayerRow[] =>
  salah.prays.map(p => ({
    name: ARABIC[p.pray],
    time: arabicDigits(p.clock),
    state: p.at === salah.next.at && p.pray === salah.next.pray && p.at > now ? 'next' : p.at <= now ? 'done' : 'upcoming',
  }))

export const prayerCard = (salah: PanelSalah | null, now: number): PrayerCard => salah === null
  ? { isSet: false, city: '', nextName: '', nextTime: '', until: '', rows: [], isAthan: false }
  : {
    isSet: true,
    city: salah.city,
    nextName: ARABIC[salah.next.pray],
    nextTime: arabicDigits(salah.next.clock),
    until: untilText(salah.next.at - now),
    rows: prayerRows(salah, now),
    isAthan: salah.isAthan,
  }

// The period's title without tashkeel says المساء or الصباح.
export const isEvening = (title: string): boolean => title.replace(/[\u064B-\u065F\u0670]/g, '').includes('المساء')

export const athkarCard = (athkar: PanelAthkar | null): AthkarCard => athkar === null
  ? { isAvailable: false }
  : { isAvailable: true, isEvening: isEvening(athkar.title), title: athkar.title, fraction: arabicDigits(`${athkar.done} / ${athkar.total}`), progress: Math.max(0, Math.min(1, athkar.progress)), isDone: athkar.isDone }

export const quranCard = (quran: PanelQuran | null): QuranCard => quran === null ? { isAvailable: false } : { ...quran, isAvailable: true, progress: Math.max(0, Math.min(1, quran.progress)) }

export const paneModel = (feeds: { salah: PanelSalah | null; quran: PanelQuran | null; athkar: PanelAthkar | null }, now: number, width: number, color: Accent, theme?: 'light' | 'dark', folds: Folds = NO_FOLDS): PaneModel => ({
  width,
  folds,
  color,
  ...(theme ? { theme } : {}),
  prayer: prayerCard(feeds.salah, now),
  quran: quranCard(feeds.quran),
  athkar: athkarCard(feeds.athkar),
})

// The terminal fallback: the same three cards as plain lines. `show` is the
// shared Arabic path for the terminal; the caller passes it.
export const textLines = (model: PaneModel, show: (text: string) => string): string[] => {
  const lines: string[] = ['**Muslim**', '']
  const p = model.prayer
  lines.push(`**${show('الصلاة')}**${p.isSet ? ` · ${p.city}` : ''}`)
  if (!p.isSet) lines.push('Not set up. /salah city')
  else {
    lines.push(`Next: ${show(p.nextName)} ${show(p.nextTime)} · ${p.until}`)
    for (const row of p.rows) lines.push(`${row.state === 'done' ? '✓' : row.state === 'next' ? '▸' : '○'} ${show(row.name)} ${show(row.time)}`)
    lines.push(`Athan ${p.isAthan ? 'on' : 'off'}`)
  }
  lines.push('', `**${show('القرآن')}**`)
  const q = model.quran
  if (!q.isAvailable) lines.push('Not ready. /quran (desktop player)')
  else {
    lines.push(`${show(q.reciter)}`, `${show(q.surah)}${q.part ? ` · ${show(q.part)}` : ''}`, `${q.elapsed} / ${q.total} · ${q.isPlaying ? 'playing' : 'stopped'}`)
  }
  lines.push('', `**${show('أذكار')}**`)
  const k = model.athkar
  if (!k.isAvailable) lines.push('Athkar are off. /athkar on')
  else lines.push(`${show(k.title)} ${show(k.fraction)}`)
  return lines
}

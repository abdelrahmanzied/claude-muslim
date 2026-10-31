// Fixed inputs for the desktop drawings, shared by the guard tests and by scripts/visual
// (the picture tests). Plain imports only: no $ and no test API.
import { bandHeight, bandSvg, type BandModel } from '../../src/features/athkar/band.ts'
import { ATHKAR } from '../../src/features/athkar/data.ts'
import { athanSvg, type AthanCardProps } from '../../src/features/salah/card.ts'
import { paneModel } from '../../src/features/muslim-pane/model.ts'
import { paneSvg } from '../../src/features/muslim-pane/view.ts'
import { DEFAULT_SETTINGS } from '../../src/features/muslim-pane/settings.ts'
import { REST_PX } from '../../src/shared/card/card.ts'
import { drawText, textCss } from '../../src/shared/text/index.ts'
import { TAJAWAL_FAMILY, tajawalFontFaceCss } from '../../src/shared/font/index.ts'
import { END } from '../../src/features/athkar/logic.ts'

export const NOW = 1_700_000_000_000
export const CARD = { ch: 8.4, lh: 20 }
// Surat an-Nas: the thikr with the most stacked marks (shadda with a vowel, hamza with a vowel).
export const NAS = ATHKAR.find(t => t.id === '76-nas')!

export const bandModel = (over: Partial<BandModel> = {}, width = 600): BandModel => {
  const m: BandModel = {
    phase: 'reading', period: 'morning', sky: 'day', style: 'sky', accent: 'orange', isActive: true, hasBegun: true,
    title: 'أَذْكَارُ الصَّبَاحِ', thikrId: NAS.id, text: NAS.text, note: NAS.note, position: '٣ مِنْ ٢٢', count: 1, times: NAS.times,
    progress: 14, from: 10, end: END, endHint: 'h', endNote: 'أَتْمَمْتَ وِرْدَكَ ✓ · مَوْعِدُنَا الصَّبَاحُ', now: 0, width, height: 0, restHeight: REST_PX, textSize: 15, card: CARD, ...over,
  }
  m.height = bandHeight(m, width)

  return m
}

export const band = (over: Partial<BandModel> = {}, width = 600) => bandSvg(bandModel(over, width))

export const athanProps = (photo: string, isFolded: boolean): AthanCardProps => ({ isActive: true, isFolded, now: 0, pray: 'fajr', time: '05:00', photo, width: 700, card: CARD })
export const athan = (photo: string, isFolded: boolean) => athanSvg(athanProps(photo, isFolded), { hoverClose: false, columns: 0 })

export const feeds = {
  salah: {
    city: 'Munich',
    prays: [
      { pray: 'fajr' as const, at: NOW - 600_000, clock: '05:48' },
      { pray: 'dhuhr' as const, at: NOW - 100_000, clock: '12:58' },
      { pray: 'asr' as const, at: NOW + 4_320_000, clock: '15:42' },
      { pray: 'maghrib' as const, at: NOW + 14_400_000, clock: '18:21' },
      { pray: 'isha' as const, at: NOW + 20_000_000, clock: '19:52' },
    ],
    next: { pray: 'asr' as const, at: NOW + 4_320_000, clock: '15:42' },
    isAthan: true,
  },
  quran: { error: '', reciter: 'محمد صديق المنشاوي', surah: 'سورة البقرة', part: 'الربع ٥ - الآيات ١٥–٢٤ (١ من ٢)', segmented: true, status: 'يتلى الآن', isLive: true, elapsed: '12:03', total: '41:20', progress: 0.29, isPlaying: true, canPrev: true, canNext: true, repeat: 'off' as const, avatar: '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="90" viewBox="0 0 96 90"></svg>', audioNote: '' },
  athkar: { set: 'evening' as const, canUndo: false, title: 'أَذْكَارُ الْمَسَاءِ', done: 4, total: 12, progress: 0.33, isDone: false },
}

export const settings = (category: 'general' | 'prayer' | 'athkar' | 'thikr', face: 'main' | 'methods' | 'adjust' | 'city' = 'main') =>
  ({ ...DEFAULT_SETTINGS, state: { open: true, category, face, page: 0 } })

export const surahs = ['الفَاتِحَة', 'البَقَرَة', 'آل عِمْرَان', 'النِّسَاء', 'المَائِدَة', 'الأَنْعَام'].map((label, i) => ({ value: String(i + 1), label, number: String(i + 1), selected: i === 1 }))

export const pane = (width: number, theme: 'dark' | 'light', s = DEFAULT_SETTINGS, withPicker = false, quran = feeds.quran) =>
  paneSvg(paneModel({ ...feeds, quran }, NOW, width, 'orange', theme, undefined, s, withPicker ? { list: 'surah', query: '', highlight: 1, scroll: 0, count: surahs.length, rows: surahs, dragging: false } : null))

// The shared text component alone, in several scripts: each row is a clipped line (the shared
// `tx-line` class) at the font size shown. Used by the picture tests so an engine change that
// hits the marks of any script shows up, not only Arabic.
export const SAMPLES: readonly { lang: string; text: string; size: number }[] = [
  { lang: 'ar', text: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ مَلِكِ النَّاسِ إِلَهِ النَّاسِ مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ', size: 15 },
  { lang: 'ar', text: 'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا', size: 20 },
  { lang: 'fa', text: 'پاکِستان و ایران؛ زبانِ فارسی', size: 15 },
  { lang: 'ur', text: 'اُردُو زَبان کی خُوبصُورتی', size: 15 },
  { lang: 'vi', text: 'Tiếng Việt: ắ ề ỗ ử ợ Hà Nội, Việt Nam thân thương', size: 15 },
  { lang: 'tr', text: 'Ğüşöç ığ İstanbul Şişli Çağdaş Öğrenci', size: 15 },
  { lang: 'id', text: 'Selamat pagi, apa kabar hari ini?', size: 15 },
]

export const textSample = (): string => {
  const rows = SAMPLES.map(s => `<div style="font-size:${s.size}px;margin:4px 0">${drawText(s.text, { lang: s.lang })}</div>`).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="${SAMPLES.length * 40 + 16}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="padding:8px 12px;color:#ecebe6;font-family:${TAJAWAL_FAMILY}"><style>${tajawalFontFaceCss()}${textCss()}</style>${rows}</div></foreignObject></svg>`
}

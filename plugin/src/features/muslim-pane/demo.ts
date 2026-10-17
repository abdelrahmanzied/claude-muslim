// DEMO BEGIN: pure scenes and timing of the Muslim pane tour; no $, no saved state.
// The feeds are fixed: Fajr at 05:00 (as `/salah demo`), a Quran card that looks playing (no audio),
// and athkar filling scene by scene. The runner in install.tsx only draws them.
import type { PanelAthkar, PanelPray, PanelQuran, PanelSalah } from '../../shared/panel/signal.ts'
import type { Folds } from './layout.ts'

export const DEMO_TICK_MS = 200
// When each card unfolds, and when each folds back (athkar first, so the tour mirrors itself).
export const DEMO_UNFOLD_MS = { prayer: 600, quran: 2000, athkar: 3600 } as const
export const DEMO_FOLD_MS = { athkar: 8200, quran: 8800, prayer: 9400 } as const
// Athkar fill from the moment it unfolds until DEMO_ATHKAR_DONE_MS, then show done.
export const DEMO_ATHKAR_DONE_MS = 7400
export const DEMO_ATHKAR_TOTAL = 6
export const DEMO_DURATION_MS = 10_000

export const demoReply = (): string => '**Muslim pane demo:** all cards unfold, play and fold back (about 10 s); nothing is saved.'
export const demoTerminalReply = (): string => 'The Muslim pane demo is desktop only. Run /muslim demo pane in the Claude desktop app.'

// 05:00 on a fixed day; the prays are on the same fixed day.
const DAY = Date.UTC(2000, 0, 1)
const MIN = 60_000
const clock = (hour: number, minute: number): string => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
const PRAYS: readonly { pray: PanelPray; hour: number; minute: number }[] = [
  { pray: 'fajr', hour: 5, minute: 0 }, { pray: 'dhuhr', hour: 12, minute: 0 }, { pray: 'asr', hour: 15, minute: 30 },
  { pray: 'maghrib', hour: 18, minute: 0 }, { pray: 'isha', hour: 19, minute: 30 },
]
const prays = PRAYS.map(p => ({ pray: p.pray, at: DAY + (p.hour * 60 + p.minute) * MIN, clock: clock(p.hour, p.minute) }))
// The countdown starts 48 minutes before Fajr and drops a minute every half second.
export const demoNow = (elapsed: number): number => prays[0]!.at - 48 * MIN + Math.floor(Math.max(0, elapsed) / 500) * MIN

export const demoSalah = (): PanelSalah => ({ city: 'القاهرة', prays, next: prays[0]!, isAthan: true })

const clockText = (ms: number): string => `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`
const RECITER_START_MS = 192_000
const RECITER_TOTAL_MS = 3_750_000
// The Quran card: playing from the start, the progress and time advancing with the tour. `avatar` is drawn by the caller.
export const demoQuran = (elapsed: number, avatar: string): PanelQuran => {
  const at = RECITER_START_MS + Math.max(0, elapsed)
  return {
    reciter: 'محمد صديق المنشاوي · مرتل', surah: 'سورة الكهف', part: '', segmented: false,
    status: 'يتلى الآن', isLive: true, elapsed: clockText(at), total: clockText(RECITER_TOTAL_MS), progress: at / RECITER_TOTAL_MS,
    isPlaying: true, canPrev: true, canNext: true, repeat: 'off', avatar,
  }
}

// How many athkar are counted at `elapsed`: none before the card opens, all by DEMO_ATHKAR_DONE_MS.
export const demoAthkarDone = (elapsed: number): number => {
  const span = DEMO_ATHKAR_DONE_MS - DEMO_UNFOLD_MS.athkar
  return Math.max(0, Math.min(DEMO_ATHKAR_TOTAL, Math.floor(((elapsed - DEMO_UNFOLD_MS.athkar) / span) * (DEMO_ATHKAR_TOTAL + 1))))
}
// `title` is the authored period title from the athkar data.
export const demoAthkar = (elapsed: number, title: string): PanelAthkar => {
  const done = demoAthkarDone(elapsed)
  return { set: 'morning', canUndo: false, title, done, total: DEMO_ATHKAR_TOTAL, progress: done / DEMO_ATHKAR_TOTAL, isDone: done >= DEMO_ATHKAR_TOTAL }
}

// All three start folded; each unfolds in turn and folds back at the end. Settings is never part of the tour.
export const demoFolds = (elapsed: number): Folds => ({
  prayer: elapsed < DEMO_UNFOLD_MS.prayer || elapsed >= DEMO_FOLD_MS.prayer,
  quran: elapsed < DEMO_UNFOLD_MS.quran || elapsed >= DEMO_FOLD_MS.quran,
  athkar: elapsed < DEMO_UNFOLD_MS.athkar || elapsed >= DEMO_FOLD_MS.athkar,
})
export const isDemoOver = (elapsed: number): boolean => elapsed >= DEMO_DURATION_MS
// DEMO END

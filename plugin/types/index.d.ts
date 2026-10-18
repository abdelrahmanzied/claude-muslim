// State contract: each value the mod keeps in `$.state`, under the mod's name.

export type Fard = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'

// A usage limit that stopped Claude: when it resets (ms since epoch), or
// `null` when unknown and it clears on the next turn.
export type UsageLimit = { until: number | null }

// The athkar read today, all three sets; see src/features/athkar/logic.ts.
// Completion includes explicit confirmation, which fills every count.
// The end question and its selection live only in the feature module, never $.state.
export type AthkarReading = {
  index: number
  counts: Record<string, number>
  isDone: boolean
  isHidden: boolean
}

export type Day = {
  day: string
  morning: AthkarReading
  evening: AthkarReading
  afterSalah: AthkarReading & { pray: Fard | null; at: number | null }
}
// Minutes the user adds to each pray time.
export type SalahAdjust = Record<'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', number>

// The countdown window of the next pray, while now is inside it: salah
// writes it, thikr reads it. `null` outside the window, or with salah off.
export type SalahWindow = { pray: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'; at: number }

// Last obligatory prayer that came in today in the configured place, or null.
export type SalahLast = { pray: Fard; at: number }

// Current place-calendar-day bounds in epoch ms, supplied on read by salah for athkar.
export type SalahAthkarTimes = { day: string; previousDay: string; fajr: number; sunrise: number; maghrib: number; isha: number; nextFajr: number }

// The terminal moment: rise frame (1 to 7), fold and expiry deadlines in ms since epoch.
export type SalahMinaret = { pray: SalahWindow['pray']; frame: number; startedAt: number; foldsAt: number; isFolded: boolean; until: number }

// The desktop moment: call, clock text, persisted fold and expiry deadlines in ms since epoch.
export type SalahCard = { pray: SalahWindow['pray']; time: string; foldsAt: number; isFolded: boolean; until: number }

// Repeat is one of: off, the whole surah (every quarter then start over), or the current quarter only.
export type QuranRepeat = 'off' | 'surah' | 'segment'
export type QuranPlaying = { moshafKey: string; surah: number; startedAt: number; durationMs: number | null; segmentIndex?: number; segmentCount?: number }

export type PaneSettings = { open: boolean; category: 'prayer' | 'athkar' | 'thikr' | 'general'; face: 'main' | 'methods' | 'adjust' | 'city'; page: number }
// A copy button that just copied: its command and the time (ms since the epoch) its «تم النسخ» confirmation ends.
export type PaneCopied = { command: string; until: number }
// The Muslim pane's open Quran picker: which list, the typed query, the highlighted row, the first visible row and a
// scrollbar drag in progress (`cell` is the pane pixels one pointer row stood for at the press; null when unknown).
export type PanePicker = { list: 'reciter' | 'surah' | 'segment'; query: string; highlight: number; scroll: number; drag: { y: number; scroll: number; cell: number | null } | null }
export type PaneOptimistic = Partial<Record<'tashkeel' | 'thikr' | 'athkar' | 'salahAthan' | 'paneButton' | 'thikrEnd', boolean>>

declare module 'claude-code' {
  interface PluginState {
    muslim: {
      quranPlaying: QuranPlaying | null
      quranRepeat: QuranRepeat
      quranError: string | null
      quranCommandError: string | null
      quranSurah: number

      // Settings hub, one selected tab and its detail/page, kept across reloads.
      paneSettings: PaneSettings | null
      // Immediate settings-switch display until config reload confirms it.
      paneOptimistic: PaneOptimistic
      // Pending marketplace auto-update switch; cleared on confirmation or failure.
      paneAutoUpdate: boolean | null
      // The copy button's transient confirmation; expires at `until`.
      paneCopied: PaneCopied | null
      // The Quran card's open picker, or null.
      panePicker: PanePicker | null
      // The athkar card's title menu, kept with the pane's UI state.
      paneAthkarMenu: boolean
      // Which daily cards are folded to their title row.
      paneFolds: { prayer: boolean; quran: boolean; athkar: boolean } | null

      // Terminal whose picker was opened by /muslim terminal-arabic.
      arabicSurveyManualTerminal: string | null
      // Per-terminal mode cached for this session's thikr renders.
      arabicTerminalMode: { terminalId: string; mode: 'plain' | 'joined' | 'reversed' } | null
      usageLimit: UsageLimit | null
      athkar: Day | null
      // First salah setup answer, ms since epoch; persisted as firstRun.remindFrom.
      firstRunRemindFrom: number | null
      // Pray times setup put off with Not now, for this session.
      salahSetupLater: boolean
      // The pray times review form's minutes while it is open, else null.
      salahReview: SalahAdjust | null
      salahWindow: SalahWindow | null
      salahLast: SalahLast | null
      // Desktop athan button requests this prayer's reader; salah writes, athkar reads.
      salahAfterSalahStart: SalahLast | null
      // The pray time (ms since epoch) whose minaret has played, so it plays once.
      salahAthanShown: number | null
      salahMinaret: SalahMinaret | null
      salahCard: SalahCard | null
      // The pray line drawn as its own row above the prompt, else null.
      salahLine: string | null
    }
  }
}

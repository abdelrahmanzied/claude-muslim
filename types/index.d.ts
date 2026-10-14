// State contract: each value the mod keeps in `$.state`, under the mod's name.

// A usage limit that stopped Claude: when it resets (ms since epoch), or
// `null` when unknown and it clears on the next turn.
export type UsageLimit = { until: number | null }

// Minutes the user adds to each pray time.
export type SalahAdjust = Record<'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', number>

// The countdown window of the next pray, while now is inside it: salah
// writes it, thikr reads it. `null` outside the window, or with salah off.
export type SalahWindow = { pray: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'; at: number }

// The terminal minaret while it plays: the pray and how many rows (1 to 7) have risen.
export type SalahMinaret = { pray: SalahWindow['pray']; frame: number }

// The desktop athan card while it shows: the pray, its clock text and when it ends by itself (ms since epoch).
export type SalahCard = { pray: SalahWindow['pray']; time: string; until: number }

// Repeat is one of: off, the whole surah (every quarter then start over), or the current quarter only.
export type QuranRepeat = 'off' | 'surah' | 'segment'
export type QuranPlaying = { moshafKey: string; surah: number; startedAt: number; durationMs: number | null; segmentIndex?: number; segmentCount?: number }

declare module 'claude-code' {
  interface PluginState {
    muslim: {
      quranPlaying: QuranPlaying | null
      quranRepeat: QuranRepeat
      quranError: string | null
      quranCommandError: string | null
      quranSurah: number

      // Terminal whose picker was opened by /muslim terminal-arabic.
      arabicSurveyManualTerminal: string | null
      // Per-terminal mode cached for this session's thikr renders.
      arabicTerminalMode: { terminalId: string; mode: 'plain' | 'joined' | 'reversed' } | null
      usageLimit: UsageLimit | null
      // Pray times setup put off with Not now, for this session.
      salahSetupLater: boolean
      // The pray times review form's minutes while it is open, else null.
      salahReview: SalahAdjust | null
      salahWindow: SalahWindow | null
      // The pray time (ms since epoch) whose minaret has played, so it plays once.
      salahAthanShown: number | null
      salahMinaret: SalahMinaret | null
      salahCard: SalahCard | null
      // The pray line drawn as its own row above the prompt, else null.
      salahLine: string | null
    }
  }
}

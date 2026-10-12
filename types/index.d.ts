// State contract: each value the mod keeps in `$.state`, under the mod's name.

// A usage limit that stopped Claude: when it resets (ms since epoch), or
// `null` when unknown and it clears on the next turn.
export type UsageLimit = { until: number | null }

// The athkar read today, both periods; see src/features/athkar/logic.ts.
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
}
// Minutes the user adds to each pray time.
export type SalahAdjust = Record<'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', number>

// The countdown window of the next pray, while now is inside it: salah
// writes it, thikr reads it. `null` outside the window, or with salah off.
export type SalahWindow = { pray: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'; at: number }

// The terminal moment: rise frame (1 to 7), fold and expiry deadlines in ms since epoch.
export type SalahMinaret = { pray: SalahWindow['pray']; frame: number; startedAt: number; foldsAt: number; isFolded: boolean; until: number }

// The desktop moment: call, clock text, persisted fold and expiry deadlines in ms since epoch.
export type SalahCard = { pray: SalahWindow['pray']; time: string; foldsAt: number; isFolded: boolean; until: number }

declare module 'claude-code' {
  interface PluginState {
    muslim: {
      // Terminal whose picker was opened by /muslim terminal-arabic.
      arabicSurveyManualTerminal: string | null
      // Per-terminal mode cached for this session's thikr renders.
      arabicTerminalMode: { terminalId: string; mode: 'plain' | 'joined' | 'reversed' } | null
      usageLimit: UsageLimit | null
      athkar: Day | null
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

// State contract: each value the mod keeps in `$.state`, under the mod's name.

// A usage limit that stopped Claude: when it resets (ms since epoch), or
// `null` when unknown and it clears on the next turn.
export type UsageLimit = { until: number | null }

// Minutes the user adds to each prayer time.
export type SalahAdjust = Record<'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', number>

// The reminder window of the next prayer, while now is inside it: salah
// writes it, thikr reads it. `null` outside the window, or with salah off.
export type SalahWindow = { prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'; at: number }

// The terminal minaret while it plays: the prayer and how many rows (1 to 7) have risen.
export type SalahMinaret = { prayer: SalahWindow['prayer']; frame: number }

// The desktop athan card while it shows: the prayer, its clock text and when it ends by itself (ms since epoch).
export type SalahCard = { prayer: SalahWindow['prayer']; time: string; until: number }

declare module 'claude-code' {
  interface PluginState {
    muslim: {
      // Terminal whose picker was opened by /muslim terminal-arabic.
      arabicSurveyManualTerminal: string | null
      // Per-terminal mode cached for this session's thikr renders.
      arabicTerminalMode: { terminalId: string; mode: 'none' | 'plain' | 'joined' | 'reversed' } | null
      usageLimit: UsageLimit | null
      // Prayer times setup put off with Not now, for this session.
      salahSetupLater: boolean
      // The prayer times review form's minutes while it is open, else null.
      salahReview: SalahAdjust | null
      salahWindow: SalahWindow | null
      // The prayer time (ms since epoch) whose minaret has played, so it plays once.
      salahAthanShown: number | null
      salahMinaret: SalahMinaret | null
      salahCard: SalahCard | null
      // The prayer line drawn as its own row above the prompt, else null.
      salahLine: string | null
    }
  }
}

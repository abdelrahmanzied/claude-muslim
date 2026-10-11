// State contract: each value the mod keeps in `$.state`, under the mod's name.

// A usage limit that stopped Claude: when it resets (ms since epoch), or
// `null` when unknown and it clears on the next turn.
export type UsageLimit = { until: number | null }

declare module 'claude-code' {
  interface PluginState {
    muslim: {
      // Terminal whose picker was opened by /muslim terminal-arabic.
      arabicSurveyManualTerminal: string | null
      // Per-terminal mode cached for this session's thikr renders.
      arabicTerminalMode: { terminalId: string; mode: 'plain' | 'joined' | 'reversed' } | null
      usageLimit: UsageLimit | null
    }
  }
}

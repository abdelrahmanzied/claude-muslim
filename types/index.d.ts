// State contract: each value the mod keeps in `$.state`, under the mod's name.

// A usage limit that stopped Claude: when it resets (ms since epoch), or
// `null` when unknown and it clears on the next turn.
export type UsageLimit = { until: number | null }

declare module 'claude-code' {
  interface PluginState {
    muslim: {
      // Show the terminal Arabic hotkey picker in AbovePrompt.
      arabicFixPicking: boolean
      // Let an explicit command reopen the picker after automatic first-run.
      arabicFixManual: boolean
      usageLimit: UsageLimit | null
    }
  }
}

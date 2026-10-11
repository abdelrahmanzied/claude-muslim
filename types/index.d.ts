// State contract: each value the mod keeps in `$.state`, under the mod's name.

// A usage limit that stopped Claude: when it resets (ms since epoch), or
// `null` when unknown and it clears on the next turn.
export type UsageLimit = { until: number | null }

declare module 'claude-code' {
  interface PluginState {
    muslim: {
      // Terminal Arabic check answered (including Later); also kept in $.store.
      arabicFixAnswered: boolean
      // Prevent overlapping button presses while saving the answer.
      arabicFixBusy: boolean
      usageLimit: UsageLimit | null
    }
  }
}

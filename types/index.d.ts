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

declare module 'claude-code' {
  interface PluginState {
    muslim: {
      usageLimit: UsageLimit | null
      athkar: Day | null
    }
  }
}

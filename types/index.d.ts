// State contract: each value the mod keeps in `$.state`, under the mod's name.

// A usage limit that stopped Claude: when it resets (ms since epoch), or
// `null` when unknown and it clears on the next turn.
export type UsageLimit = { until: number | null }

// Minutes the user adds to each prayer time.
export type SalahAdjust = Record<'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', number>

declare module 'claude-code' {
  interface PluginState {
    muslim: {
      usageLimit: UsageLimit | null
      // Prayer times setup put off with Not now, for this session.
      salahSetupLater: boolean
      // The prayer times review form's minutes while it is open, else null.
      salahReview: SalahAdjust | null
      // The prayer time (ms since epoch) last notified, so a reload does not notify it again.
      salahNotified: number | null
    }
  }
}

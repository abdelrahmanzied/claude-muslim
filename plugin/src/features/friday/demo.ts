// DEMO BEGIN: the Al-Kahf card for a fixed time; no settings, store or saved state.
export const DEMO_MS = 6000
export const DEMO_TICK_MS = 500

export const demoReply = (): string => `**Friday demo:** the Al-Kahf card for ${DEMO_MS / 1000} s. Nothing is saved.`

// The card is showing at `now`, for a demo started at `startedAt`.
export const demoShowing = (startedAt: number, now: number): boolean => now - startedAt < DEMO_MS
// DEMO END

export type RateLimitWindow = { percentUsed: number; resetsAt?: string }

// When a usage limit stops Claude: the latest reset among the full windows,
// `null` when no window says when (cleared on the next turn instead), or
// `undefined` when no window is full and the stop was a passing throttle.
export const limitUntil = (windows: readonly RateLimitWindow[]): number | null | undefined => {
  if (windows.length === 0) return null
  const full = windows.filter(window => window.percentUsed >= 100)
  if (full.length === 0) return undefined
  const resets = full
    .map(window => (window.resetsAt ? Date.parse(window.resetsAt) : NaN))
    .filter(time => Number.isFinite(time))

  return resets.length === 0 ? null : Math.max(...resets)
}

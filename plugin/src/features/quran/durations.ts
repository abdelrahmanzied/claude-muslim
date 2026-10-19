// Insertion order retains the 120 most recently learned duration numbers.
export const DURATION_LIMIT = 120
export const readDurations = (raw: unknown): Record<string, number> =>
  raw && typeof raw === 'object' && !Array.isArray(raw)
    ? Object.fromEntries(Object.entries(raw).filter(([, n]) => typeof n === 'number' && Number.isFinite(n) && n > 0)) : {}
export const trimDurations = (raw: unknown, key: string, ms: number): Record<string, number> => {
  const durations = readDurations(raw)
  delete durations[key]
  return Object.fromEntries([...Object.entries(durations), [key, ms]].slice(-DURATION_LIMIT))
}

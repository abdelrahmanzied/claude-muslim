import type { ConfigRow } from 'claude-code'

export const MISSING_CONFIG = 'Not changed: run /reload-plugins, then try again.'
export const hasConfigRow = (rows: readonly ConfigRow[], key: string): boolean => rows.some(row => row.key === key)
export const configFailure = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error)
  return /no \/config row/i.test(message) ? MISSING_CONFIG : `Not changed: ${message}`
}

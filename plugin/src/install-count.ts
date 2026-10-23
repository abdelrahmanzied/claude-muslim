// The anonymous install count: the first session on a machine sends one request with
// { version, surface, os } and never again. Pure: no `$`; the runner is in hooks/register.tsx.
// The record is kept in `$.store` under INSTALL_KEY, so the environment is read only once.

export const INSTALL_URL = 'https://abdelrahman.ai/api/muslim/install'
export const INSTALL_KEY = 'install'

export type Surface = 'terminal' | 'desktop'
export type Os = 'mac' | 'linux' | 'windows'
export type InstallRecord = { at: string; version: string; surface: Surface; os: Os; sent: boolean }

// The surfaces muslim draws on; any other is not counted.
export const countedSurface = (surface: string | null | undefined): Surface | undefined =>
  surface === 'terminal' || surface === 'desktop' ? surface : undefined

// Windows always sets OS=Windows_NT; a macOS home folder is under /Users; anything else is Linux.
export const osFrom = (env: { OS?: string; HOME?: string }): Os =>
  env.OS === 'Windows_NT' ? 'windows' : env.HOME?.startsWith('/Users/') ? 'mac' : 'linux'

// The common opt-outs: DO_NOT_TRACK=1 and Claude Code's own CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC.
export const optedOut = (env: { DO_NOT_TRACK?: string; CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC?: string }): boolean =>
  isSet(env.DO_NOT_TRACK) || isSet(env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC)

const isSet = (value: string | undefined): boolean => value !== undefined && value !== '' && value !== '0' && value.toLowerCase() !== 'false'

export const newRecord = (now: number, version: string, surface: Surface, os: Os): InstallRecord =>
  ({ at: new Date(now).toISOString().slice(0, 10), version, surface, os, sent: false })

// A stored value from this version or a later one; anything else starts over.
export const readRecord = (value: unknown): InstallRecord | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const v = value as Record<string, unknown>
  if (typeof v.at !== 'string' || typeof v.version !== 'string' || typeof v.sent !== 'boolean') return undefined
  const surface = countedSurface(typeof v.surface === 'string' ? v.surface : undefined)
  const os = v.os === 'mac' || v.os === 'linux' || v.os === 'windows' ? v.os : undefined
  return surface && os ? { at: v.at, version: v.version, surface, os, sent: v.sent } : undefined
}

// Only what the count needs: no date, id, path or name.
export const installBody = ({ version, surface, os }: InstallRecord): string => JSON.stringify({ version, surface, os })

// A 2xx is counted; a 4xx will never be, so it is not tried again. A 5xx or no answer tries next start.
export const isDone = (status: number): boolean => status >= 200 && status < 500

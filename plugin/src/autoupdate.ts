// `/muslim autoupdate`: the pure part of turning Claude Code's marketplace auto-update on or
// off for `claude-muslim`. The flag lives in the user's settings.json, on the marketplace
// entry beside `source`: extraKnownMarketplaces["claude-muslim"].autoUpdate. No `$` here;
// the file reads and writes happen in hooks/register.tsx.

export const MARKETPLACE = 'claude-muslim'
export const AUTOUPDATE_USAGE = 'Usage: /muslim autoupdate on | off'

export type Parsed = { ok: true; data: Record<string, unknown> } | { ok: false; reason: string }
export type AutoUpdateState = 'on' | 'off' | 'default' | 'missing'

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

// The user settings file: CLAUDE_CONFIG_DIR, else HOME, else USERPROFILE (Windows), + .claude.
export const settingsPath = (env: { config?: string; home?: string; profile?: string }): string | undefined => {
  const clean = (value?: string) => (value && value.trim() !== '' ? value.trim().replace(/[\\/]+$/, '') : undefined)
  const config = clean(env.config)
  if (config) return `${config}/settings.json`
  const home = clean(env.home) ?? clean(env.profile)

  return home ? `${home}/.claude/settings.json` : undefined
}

// Only a file that is a JSON object may be edited; anything else is left alone.
export const parseSettings = (text: string): Parsed => {
  try {
    const data: unknown = JSON.parse(text)
    return isObject(data) ? { ok: true, data } : { ok: false, reason: 'it is not a JSON object' }
  } catch {
    return { ok: false, reason: 'it is not valid JSON' }
  }
}

const entry = (settings: unknown): Record<string, unknown> | undefined => {
  if (!isObject(settings) || !isObject(settings.extraKnownMarketplaces)) return undefined
  const found = settings.extraKnownMarketplaces[MARKETPLACE]
  return isObject(found) ? found : undefined
}

// `missing`: no claude-muslim entry. `default`: entry without a true/false (Claude Code's default is off).
export const autoUpdateState = (settings: unknown): AutoUpdateState => {
  const found = entry(settings)
  if (!found) return 'missing'
  if (found.autoUpdate === true) return 'on'
  if (found.autoUpdate === false) return 'off'

  return 'default'
}

// The text of the settings file with only that one key changed; undefined when the entry is missing.
export const withAutoUpdate = (data: Record<string, unknown>, value: boolean): string | undefined => {
  if (!entry(data)) return undefined
  const markets = data.extraKnownMarketplaces as Record<string, Record<string, unknown>>
  const next = { ...data, extraKnownMarketplaces: { ...markets, [MARKETPLACE]: { ...markets[MARKETPLACE], autoUpdate: value } } }

  return `${JSON.stringify(next, null, 2)}\n`
}

// The first run only: turn it on when the entry exists and the user never chose.
export const shouldSeed = (data: Record<string, unknown>): boolean => autoUpdateState(data) === 'default'

export const stateText = (state: AutoUpdateState | 'unknown'): string =>
  state === 'on' ? 'on' : state === 'off' ? 'off' : state === 'default' ? 'off (not chosen yet)' : state === 'missing' ? 'not available' : 'unknown'

export const statusReply = (state: AutoUpdateState | 'unknown'): string => {
  if (state === 'missing') return `Auto-update is not available: no "${MARKETPLACE}" marketplace in your Claude Code user settings. ${AUTOUPDATE_USAGE}`
  if (state === 'unknown') return `Auto-update: could not read your user settings. ${AUTOUPDATE_USAGE}`

  return `Auto-update ${stateText(state)}. ${AUTOUPDATE_USAGE}`
}

export const changedReply = (value: boolean): string =>
  value
    ? 'Auto-update on: Claude Code refreshes muslim in the background (from the next session).'
    : 'Auto-update off: update with /muslim update when you want to (from the next session).'

export const notChanged = (reason: string): string => `Not changed: ${reason}`
export const unreadable = (reason: string): string => `Not changed: your Claude Code settings file is untouched because ${reason}.`
export const noEntry = `Not changed: no "${MARKETPLACE}" marketplace in your Claude Code user settings (add it with claude plugin marketplace add).`

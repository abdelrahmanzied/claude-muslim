// `/muslim update`: read the output of `claude plugin update muslim@claude-muslim --json`
// and word the reply. Pure: no `$`; the command itself runs in hooks/register.tsx.

export const UPDATE_ARGV = ['claude', 'plugin', 'update', 'muslim@claude-muslim', '--json'] as const
export const UPDATE_TIMEOUT_MS = 120_000
export const UPDATE_SHELL = 'claude plugin update muslim@claude-muslim'
export const CHANGELOG_URL = 'https://github.com/abdelrahmanzied/claude-muslim/blob/main/CHANGELOG.md'

export type UpdateResult =
  | { kind: 'updated'; from?: string; to?: string }
  | { kind: 'latest'; version?: string }
  | { kind: 'failed'; reason: string }

export type UpdateReply = { text: string; reload: boolean }

const VERSION = /\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?/
const str = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined)
const version = (value: unknown): string | undefined => str(value)?.replace(/^v/, '')

// The last non-empty line of stdout, when it is a JSON object carrying an `outcome`.
const lastJson = (stdout: string): Record<string, unknown> | undefined => {
  const last = stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean).at(-1)
  try {
    const value: unknown = last === undefined ? undefined : JSON.parse(last)
    if (value && typeof value === 'object' && !Array.isArray(value) && 'outcome' in value) return value as Record<string, unknown>
  } catch {}
  return undefined
}

const firstLine = (text: string): string | undefined => str(text.split(/\r?\n/).find(line => line.trim() !== ''))

export const parseUpdate = (stdout: string, stderr = '', exitCode = 0): UpdateResult => {
  const json = lastJson(stdout)
  if (!json) {
    const detail = firstLine(stderr)
    return { kind: 'failed', reason: exitCode !== 0 ? (detail ?? `claude exited with code ${exitCode}`) : (detail ?? 'claude printed no result') }
  }
  const message = str(json.message)
  if (json.outcome !== 'ok') return { kind: 'failed', reason: message ?? str(json.failureCode) ?? 'unknown error' }

  const from = version(json.oldVersion)
  const to = version(json.newVersion) ?? (message ? /\bto v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?)/.exec(message)?.[1] : undefined)
  if (json.updateOutcome === 'up_to_date' || (from && to && from === to)) return { kind: 'latest', version: to ?? from }
  // "muslim is already at the latest version (0.2.0)." with no structured fields.
  if (!to && message && /already at the latest|up to date/i.test(message)) return { kind: 'latest', version: VERSION.exec(message)?.[0] }

  return { kind: 'updated', from, to }
}

// The command could not start or timed out.
export const failedToRun = (error: unknown): UpdateResult => {
  const detail = firstLine(error instanceof Error ? error.message : String(error))
  return { kind: 'failed', reason: detail ? `could not run claude (${detail})` : 'could not run claude' }
}

export const updateReply = (result: UpdateResult, running: string): UpdateReply => {
  if (result.kind === 'failed') {
    return {
      text: `Not updated: ${result.reason}\n\nRun \`${UPDATE_SHELL}\` in a shell, then \`/reload-plugins\`.`,
      reload: false,
    }
  }
  if (result.kind === 'latest') {
    // The files on disk may be newer than the code this session runs.
    if (result.version && result.version !== running) return { text: `muslim v${result.version} is installed (running v${running}). Reloading plugins.`, reload: true }
    return { text: `muslim v${result.version ?? running} is the latest.`, reload: false }
  }
  const from = result.from ?? running
  if (result.to && result.to !== from) return { text: `muslim v${from} → v${result.to}. Reloading plugins.\n\nWhat changed: ${CHANGELOG_URL}`, reload: true }

  return { text: `muslim updated (was v${from}). Reloading plugins.\n\nWhat changed: ${CHANGELOG_URL}`, reload: true }
}

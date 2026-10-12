export function formatTime(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '--:--'
  const seconds = Math.floor(Math.max(0, ms) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return seconds >= 3600 ? `${Math.floor(seconds / 3600)}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}` : `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`
}
export function progressBar(elapsed: number, total: number | null): string {
  const filled = total !== null && total > 0 ? Math.round(Math.max(0, Math.min(1, elapsed / total)) * 24) : 0
  return '━'.repeat(filled) + '─'.repeat(24 - filled)
}
export type Command = { kind: 'open' | 'help' | 'stop' | 'next' | 'prev' } | { kind: 'play'; value: string } | { kind: 'reciter'; value: string } | { kind: 'usage' }
export function parseCommand(args: string): Command {
  const [word = '', ...rest] = args.trim().split(/\s+/)
  const value = rest.join(' ')
  if (word === '' && !value) return { kind: 'open' }
  if (['help', 'stop', 'next', 'prev'].includes(word) && !value) return { kind: word as 'help' | 'stop' | 'next' | 'prev' }
  if (word === 'reciter') return { kind: 'reciter', value }
  if (word === 'play' && value) return { kind: 'play', value }
  return { kind: 'usage' }
}

// Advance only the still-active play generation on a natural end; never wrap.
export function nextSurahAfterEnd(surah: number, endedNaturally: boolean, token: number, activeToken: number): number | null {
  return endedNaturally && token === activeToken && Number.isInteger(surah) && surah >= 1 && surah < 114 ? surah + 1 : null
}

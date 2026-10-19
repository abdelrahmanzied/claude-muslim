import type { QuranRepeat } from '../../../types/index.d.ts'
import { nextAvailable } from './availability.ts'

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
export type Command = { kind: 'open' | 'help' | 'stop' | 'next' | 'prev' | 'retry' | 'repeat' | 'repeat-segment' } | { kind: 'play'; value: string; segmentIndex?: number } | { kind: 'reciter'; value: string } | { kind: 'usage' }
export function parseCommand(args: string): Command {
  const [word = '', ...rest] = args.trim().split(/\s+/)
  const value = rest.join(' ')
  if (word === '' && !value) return { kind: 'open' }
  if (['help', 'stop', 'next', 'prev', 'retry', 'repeat'].includes(word) && !value) return { kind: word as 'help' | 'stop' | 'next' | 'prev' | 'retry' | 'repeat' }
  if (word === 'repeat' && value === 'segment') return { kind: 'repeat-segment' }
  if (word === 'reciter') return { kind: 'reciter', value }
  if (word === 'play' && value) return { kind: 'play', value }
  return { kind: 'usage' }
}

// Advance only the still-active play generation on a natural end; never wrap.
export function nextSurahAfterEnd(surah: number, endedNaturally: boolean, token: number, activeToken: number, reciterKey = ''): number | null {
  return endedNaturally && token === activeToken && Number.isInteger(surah) && surah >= 1 && surah < 114 ? nextAvailable(reciterKey, surah, 1) : null
}

// Unknown stored values are off.
export const repeatMode = (value: unknown): QuranRepeat => value === 'surah' ? 'surah' : value === 'segment' ? 'segment' : 'off'
// The two repeat buttons are exclusive: pressing the active one turns repeat off.
export const toggleRepeat = (current: QuranRepeat, target: 'surah' | 'segment'): QuranRepeat => current === target ? 'off' : target
// 'segment' only means something while a split surah plays; a whole file behaves as off.
export const effectiveRepeat = (mode: QuranRepeat, split: boolean): QuranRepeat => mode === 'segment' && !split ? 'off' : mode

// 'surah' replays the whole surah: quarters still advance, then the first one
// follows the last. 'segment' replays the current quarter. Manual navigation
// never calls this rule.
export function nextPlaybackItem(surah: number, segmentIndex: number | null, segmentCount: number, repeat: QuranRepeat, endedNaturally: boolean, token: number, activeToken: number, reciterKey = ''): { surah: number; index: number } | null {
  if (!endedNaturally || token !== activeToken || !Number.isInteger(surah) || surah < 1 || surah > 114) return null
  if (repeat === 'segment' && segmentIndex !== null) return { surah, index: segmentIndex }
  if (segmentIndex !== null && segmentIndex + 1 < segmentCount) return { surah, index: segmentIndex + 1 }
  if (repeat === 'surah') return { surah, index: 0 }
  const next = nextSurahAfterEnd(surah, true, token, activeToken, reciterKey)
  return next === null ? null : { surah: next, index: 0 }
}

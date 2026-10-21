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
// What the Muslim pane asks of the player; there are no /quran subcommands.
export type Command = { kind: 'open' | 'stop' | 'next' | 'prev' | 'retry' | 'repeat' | 'repeat-segment' } | { kind: 'play'; value: string; segmentIndex?: number } | { kind: 'reciter'; value: string }

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

// Where Claude Code has no audio player (Windows and Linux today) `$.audio.play`
// resolves at once without a sound. A clip counts as played only when it lasted
// at least half its known length, or 10 seconds when the length is unknown: a
// skipped clip ends in about 0 s, and no surah or quarter is shorter than 10 s.
export const NOT_PLAYED_FLOOR_MS = 10000
export function playedThrough(elapsedMs: number, durationMs: number | null | undefined): boolean {
  const known = typeof durationMs === 'number' && Number.isFinite(durationMs) && durationMs > 0
  return Number.isFinite(elapsedMs) && elapsedMs >= (known ? durationMs / 2 : NOT_PLAYED_FLOOR_MS)
}
// The card's dim error line after a clip that never played; Retry plays it again.
const NOT_PLAYED_PREFIX = 'تعذّر سماع '
export const notPlayedError = (surahName: string, isSegment: boolean): string =>
  `${NOT_PLAYED_PREFIX}${isSegment ? 'هذا المقطع من ' : ''}سورة ${surahName}، لم يبدأ الصوت. أعد المحاولة.`
export const isNotPlayedError = (message: string): boolean => message.startsWith(NOT_PLAYED_PREFIX) && message.endsWith('لم يبدأ الصوت. أعد المحاولة.')

import { STARTING, THINKING } from './phrases.ts'

export type Group = 'starting' | 'thinking'

export type SpinnerMode =
  | 'requesting'
  | 'responding'
  | 'thinking'
  | 'tool-input'
  | 'tool-use'

const LISTS: Record<Group, string[]> = {
  starting: STARTING,
  thinking: THINKING,
}

// `requesting` opens every model call; it reads as "starting" only until the
// turn has moved on once. Everything after plays on in the thinking order.
export const groupFor = (mode: SpinnerMode, hasMovedOn: boolean): Group =>
  mode === 'requesting' && !hasMovedOn ? 'starting' : 'thinking'

// Words Claude's desktop row shows when it has nothing specific to say.
const GENERIC = new Set(['Working'])

export type SpinnerText = { word: string; message: string | null }

// Keeps what Claude tells the user and adds the thikr after it. The terminal's
// word is a decorative verb ("Sauteing"), so the thikr takes its place there;
// the desktop's word is the step ("Editing app.ts"), so it stays.
export const withThikr = (
  surface: string,
  claude: SpinnerText,
  thikr: string,
): SpinnerText => {
  const keepsWord = surface !== 'terminal' && !GENERIC.has(claude.word)
  const word = keepsWord ? `${claude.word} · ${thikr}` : thikr
  const message = claude.message === null ? null : `${claude.message} · ${thikr}`

  return { word, message }
}

// The phrase shown `elapsedMs` after the group began, one step per `speedSeconds`.
export const phraseAt = (group: Group, elapsedMs: number, speedSeconds: number): string => {
  const list = LISTS[group]
  const step = Math.floor(Math.max(0, elapsedMs) / (speedSeconds * 1000))

  return list[step % list.length] ?? list[0] ?? ''
}

const TASHKEEL = /[ً-ٰٟ]/g

export const stripTashkeel = (text: string): string => text.replace(TASHKEEL, '')

export const display = (text: string, tashkeel: boolean): string =>
  tashkeel ? text : stripTashkeel(text)

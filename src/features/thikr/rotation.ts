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

export type SpinnerText = { word: string; message: string | null; mode: SpinnerMode }

// Keeps what Claude tells the user and adds the thikr after it. Only the
// desktop's tool step ("Editing app.ts") is information; decorative verbs
// ("Musing", "Sauteing") and the generic "Working" are dropped.
export const withThikr = (
  surface: string,
  claude: SpinnerText,
  thikr: string,
): Omit<SpinnerText, 'mode'> => {
  const isToolStep = claude.mode === 'tool-use' || claude.mode === 'tool-input'
  const keepsWord = surface !== 'terminal' && isToolStep && claude.word !== 'Working'
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

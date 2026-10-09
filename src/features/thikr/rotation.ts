import { STARTING, THINKING, WRITING } from './phrases.ts'

export type Group = 'starting' | 'thinking' | 'writing'

export type SpinnerMode =
  | 'requesting'
  | 'responding'
  | 'thinking'
  | 'tool-input'
  | 'tool-use'

const LISTS: Record<Group, string[]> = {
  starting: STARTING,
  thinking: THINKING,
  writing: WRITING,
}

// `requesting` opens every model call; it reads as "starting" only until the
// turn has moved on once, so later calls stay in the thinking order.
export const groupFor = (mode: SpinnerMode, hasMovedOn: boolean): Group => {
  if (mode === 'responding') return 'writing'
  if (mode === 'requesting' && !hasMovedOn) return 'starting'
  return 'thinking'
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

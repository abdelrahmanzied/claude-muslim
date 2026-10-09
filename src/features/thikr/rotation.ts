import { LONG, STARTING, THINKING, WRITING } from './phrases.ts'

export type Group = 'starting' | 'thinking' | 'writing' | 'long'

export type SpinnerMode =
  | 'requesting'
  | 'responding'
  | 'thinking'
  | 'tool-input'
  | 'tool-use'

// `auto`: each phrase stays for its reading time; a number: seconds for every phrase.
export type Speed = 'auto' | number

const LISTS: Record<Group, string[]> = {
  starting: STARTING,
  thinking: THINKING,
  writing: WRITING,
  long: LONG,
}

// A tool running at least this long counts as a long moment.
export const LONG_TOOL_MS = 10_000

export type Moment = {
  mode: SpinnerMode
  // The turn has gone past its first request.
  hasMovedOn: boolean
  // Claude is compacting the conversation.
  isCompacting: boolean
  // A subagent is working.
  hasSubagent: boolean
  // How long the oldest running tool has run, 0 when none.
  toolRunMs: number
}

export const groupFor = (moment: Moment): Group => {
  if (moment.isCompacting || moment.hasSubagent || moment.toolRunMs >= LONG_TOOL_MS) return 'long'
  if (moment.mode === 'requesting' && !moment.hasMovedOn) return 'starting'
  if (moment.mode === 'responding') return 'writing'

  return 'thinking'
}

const AUTO_BASE_MS = 1000
const AUTO_PER_WORD_MS = 500

export const wordCount = (text: string): number => text.split(/\s+/).filter(Boolean).length

// How long one phrase stays: 1 s plus 0.5 s per word in auto, else the fixed seconds.
export const durationOf = (phrase: string, speed: Speed): number =>
  speed === 'auto' ? AUTO_BASE_MS + AUTO_PER_WORD_MS * wordCount(phrase) : speed * 1000

// Where phrase `index` begins in the group's loop, in ms.
export const startOf = (group: Group, index: number, speed: Speed): number =>
  LISTS[group].slice(0, index).reduce((sum, phrase) => sum + durationOf(phrase, speed), 0)

// A random index in [0, count), never `last` when there is another to choose.
// `roll` is a number in [0, 1).
export const pickStart = (count: number, last: number | undefined, roll: number): number => {
  if (last === undefined || count < 2) return Math.floor(roll * count)
  const index = Math.floor(roll * (count - 1))

  return index >= last ? index + 1 : index
}

// The phrase shown `elapsedMs` after the group began, the list looping.
export const phraseAt = (group: Group, elapsedMs: number, speed: Speed): string => {
  const list = LISTS[group]
  const cycle = list.reduce((sum, phrase) => sum + durationOf(phrase, speed), 0)
  let left = Math.max(0, elapsedMs) % cycle
  for (const phrase of list) {
    const stays = durationOf(phrase, speed)
    if (left < stays) return phrase
    left -= stays
  }

  return list[0] ?? ''
}

export type SpinnerText = { word: string; message: string | null; mode: SpinnerMode }

// Whether the row shows a desktop step ("Editing app.ts"). The desktop keeps
// the last step's row up after the tool ends, while Claude reads or thinks,
// so a word equal to the last tool step is still that step's row, and so is
// any word while a tool runs (a long run can report another mode).
export const isStepRow = (
  surface: string,
  claude: SpinnerText,
  lastStep: string | undefined,
  isToolRunning = false,
): boolean => {
  if (surface === 'terminal' || claude.word === 'Working' || claude.word === '') return false
  const isToolMode = claude.mode === 'tool-use' || claude.mode === 'tool-input'

  return isToolMode || isToolRunning || claude.word === lastStep
}

// Keeps what Claude tells the user and adds the thikr after it. Only a step
// is information; decorative verbs ("Musing", "Sauteing") and the generic
// "Working" are dropped.
export const withThikr = (
  claude: Omit<SpinnerText, 'mode'>,
  thikr: string,
  isStep: boolean,
): Omit<SpinnerText, 'mode'> => {
  const word = isStep ? `${claude.word} · ${thikr}` : thikr
  const message = claude.message === null ? null : `${claude.message} · ${thikr}`

  return { word, message }
}

const TASHKEEL = /[ً-ٰٟ]/g

export const stripTashkeel = (text: string): string => text.replace(TASHKEEL, '')

export const display = (text: string, tashkeel: boolean): string =>
  tashkeel ? text : stripTashkeel(text)

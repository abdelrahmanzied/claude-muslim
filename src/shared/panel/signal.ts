// Transient links between the Muslim pane and the features it shows. The pane
// never imports a feature: each feature connects, from its own hooks, a reader
// for what the pane shows and a starter for each thing the pane can ask of it,
// and the pane calls them. Plain module values, no engine API and no saved
// state; a reload clears them and each feature connects again on its next draw.

export type PanelPray = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'

// Today's five prays for the saved place, and the next one (it may be tomorrow's Fajr).
export type PanelSalah = {
  city: string
  prays: readonly { pray: PanelPray; at: number; clock: string }[]
  next: { pray: PanelPray; at: number; clock: string }
  isAthan: boolean
}

export type PanelQuran = {
  // The full reciter name with the recording, as the Quran pane's reciter field shows it.
  reciter: string
  surah: string
  // The segment being played or selected, in the shared label (`الربع ٥، الآيات ١٥–٢٤`); empty for a whole surah.
  part: string
  // True when the surah is split into segments («ابدأ من», segment repeat).
  segmented: boolean
  // `يتلى الآن`, `متوقف` or a loading text; `isLive` is the first of them.
  status: string
  isLive: boolean
  elapsed: string
  total: string
  progress: number
  isPlaying: boolean
  canPrev: boolean
  canNext: boolean
  repeat: 'off' | 'surah' | 'segment'
  // The reciter avatar as an SVG document at the Muslim card's size (96 wide), animated while playing.
  avatar: string
}

// One row of a list the card can open: a reciter, a surah or a segment.
export type PanelList = 'reciter' | 'surah' | 'segment'
export type PanelOption = { value: string; label: string; number: string; selected: boolean }

export type PanelAthkar = {
  // The period's authored title, with tashkeel as the athkar data has it.
  title: string
  done: number
  total: number
  progress: number
  isDone: boolean
}

// The Quran's list picks carry a validated string: a reciter key, a surah number, a segment index.
export type PanelAction = 'salah-city' | 'quran-toggle' | 'quran-prev' | 'quran-next' | 'quran-reciter' | 'quran-surah' | 'quran-segment' | 'quran-repeat-surah' | 'quran-repeat-segment' | 'athkar-open' | 'athkar-finish'

const feeds: {
  salah?: (now: number) => PanelSalah | null
  quran?: () => Promise<PanelQuran | null>
  quranOptions?: (list: PanelList, query: string) => Promise<PanelOption[]>
  athkar?: () => Promise<PanelAthkar | null>
} = {}
const actions = new Map<PanelAction, (value?: string) => Promise<void>>()

// Each feature captures its own hook's $; this module never receives $.
export const connectSalah = (read: (now: number) => PanelSalah | null) => { feeds.salah = read }
export const connectQuran = (read: () => Promise<PanelQuran | null>) => { feeds.quran = read }
export const connectQuranOptions = (read: (list: PanelList, query: string) => Promise<PanelOption[]>) => { feeds.quranOptions = read }
export const connectAthkar = (read: () => Promise<PanelAthkar | null>) => { feeds.athkar = read }
export const connectPanelAction = (action: PanelAction, run: (value?: string) => Promise<void>) => { actions.set(action, run) }

// A feature that is off, or not drawn yet, reads as null; one failing read never breaks the pane.
export const readSalah = (now: number): PanelSalah | null => {
  try { return feeds.salah?.(now) ?? null } catch { return null }
}
export const readQuran = async (): Promise<PanelQuran | null> => {
  try { return (await feeds.quran?.()) ?? null } catch { return null }
}
// The rows of one list for a typed query (the Quran feature owns the catalog and its search); empty when the Quran is not connected.
export const readQuranOptions = async (list: PanelList, query: string): Promise<PanelOption[]> => {
  try { return (await feeds.quranOptions?.(list, query)) ?? [] } catch { return [] }
}
export const readAthkar = async (): Promise<PanelAthkar | null> => {
  try { return (await feeds.athkar?.()) ?? null } catch { return null }
}
// Resolves whether the feature took the action. Values are validated by its owner.
export const runPanelAction = async (action: PanelAction, value?: string): Promise<boolean> => {
  const run = actions.get(action)
  if (!run) return false
  try { await run(value); return true } catch { return false }
}
export const resetPanel = () => { delete feeds.salah; delete feeds.quran; delete feeds.quranOptions; delete feeds.athkar; actions.clear() }

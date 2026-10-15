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
  reciter: string
  surah: string
  // The quarter being played, e.g. `الربع ٣ من ١٦`; empty for a whole surah.
  part: string
  elapsed: string
  total: string
  progress: number
  isPlaying: boolean
  canPrev: boolean
  canNext: boolean
}

export type PanelAthkar = {
  // The period's authored title, with tashkeel as the athkar data has it.
  title: string
  done: number
  total: number
  progress: number
  isDone: boolean
}

export type PanelAction = 'quran-toggle' | 'quran-prev' | 'quran-next' | 'quran-open' | 'athkar-open' | 'athkar-finish'

const feeds: {
  salah?: (now: number) => PanelSalah | null
  quran?: () => Promise<PanelQuran | null>
  athkar?: () => Promise<PanelAthkar | null>
} = {}
const actions = new Map<PanelAction, () => Promise<void>>()

// Each feature captures its own hook's $; this module never receives $.
export const connectSalah = (read: (now: number) => PanelSalah | null) => { feeds.salah = read }
export const connectQuran = (read: () => Promise<PanelQuran | null>) => { feeds.quran = read }
export const connectAthkar = (read: () => Promise<PanelAthkar | null>) => { feeds.athkar = read }
export const connectPanelAction = (action: PanelAction, run: () => Promise<void>) => { actions.set(action, run) }

// A feature that is off, or not drawn yet, reads as null; one failing read never breaks the pane.
export const readSalah = (now: number): PanelSalah | null => {
  try { return feeds.salah?.(now) ?? null } catch { return null }
}
export const readQuran = async (): Promise<PanelQuran | null> => {
  try { return (await feeds.quran?.()) ?? null } catch { return null }
}
export const readAthkar = async (): Promise<PanelAthkar | null> => {
  try { return (await feeds.athkar?.()) ?? null } catch { return null }
}
// Resolves whether the feature took the action.
export const runPanelAction = async (action: PanelAction): Promise<boolean> => {
  const run = actions.get(action)
  if (!run) return false
  try { await run(); return true } catch { return false }
}
export const resetPanel = () => { delete feeds.salah; delete feeds.quran; delete feeds.athkar; actions.clear() }

// How much of the Quran footer chip to show. Pure: no `$`.
//
// The mod API has no size, density or font prop for Text or Button, and Desktop
// draws the chip with its own font and padding (inherited, so they already follow
// the footer's tokens). The one lever we have is the text itself, so the chip
// sheds words as the chat column narrows, like the host's own footer items hide
// their labels first. The width is `viewport.columns`: the chat column in cells of
// the code font (about 8.4 px each on Desktop), re-sent when the window resizes.

export type ChipSize = 'full' | 'time' | 'glyph'

// Columns at which the chip drops its surah name, then its time. A tuning value:
// the host's own breakpoints are not exposed to a mod.
export const CHIP_FULL_COLUMNS = 60
export const CHIP_TIME_COLUMNS = 40

export function chipSize(columns: number | undefined, isPaneOpen: boolean): ChipSize {
  // The docked pane already shows the title and time, and narrows the column.
  if (isPaneOpen) return 'glyph'
  // Unmeasured (the app has not reported its size yet): show everything.
  if (columns === undefined || !Number.isFinite(columns)) return 'full'
  if (columns >= CHIP_FULL_COLUMNS) return 'full'
  return columns >= CHIP_TIME_COLUMNS ? 'time' : 'glyph'
}

// `name` is the idle word or the surah's name; `time` is the elapsed time while playing, else null.
export function chipText(size: ChipSize, name: string, time: string | null): string {
  if (size === 'glyph') return '۞'
  if (size === 'time') return `۞ ${time ?? name}`
  return time === null ? `۞ ${name}` : `۞ ${name} ${time}`
}

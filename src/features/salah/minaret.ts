// The terminal athan moment: a small Unicode minaret rising row by row above
// the prompt when a prayer comes in. Pure frames; install.tsx plays them.

// Top to bottom. The two top rows are the accent, the rest dim.
export const MINARET = [
  '   ☾   ',
  '   ▲   ',
  '  ┌┴┐  ',
  '  │▒│  ',
  '  ├─┤  ',
  '  │▒│  ',
  ' ▐███▌ ',
] as const

export const ACCENT_ROWS = 2
// The row the call sits beside.
export const LABEL_ROW = 3
export const FRAME_MS = 330
// How long the full minaret stays before the band goes: the whole moment is about 3 s.
export const HOLD_MS = 700
// Frames 1 to ROWS_COUNT; frame n shows the n bottom rows.
export const ROWS_COUNT = MINARET.length
export const TOTAL_MS = ROWS_COUNT * FRAME_MS + HOLD_MS

// A prayer first seen this long after its time is not announced (a late start, a reload).
export const FRESH_MS = 2 * 60_000

// The seven rows at `frame`: built from the base up, unseen rows blank so the band keeps its height.
export const minaretRows = (frame: number): string[] =>
  MINARET.map((row, i) => (i >= ROWS_COUNT - frame ? row : ' '.repeat(row.length)))

// Whether the moment plays for the prayer that came in at `at`: fresh and not yet shown.
export const isDue = (at: number, now: number, shownAt: number | null): boolean =>
  at <= now && now - at <= FRESH_MS && shownAt !== at

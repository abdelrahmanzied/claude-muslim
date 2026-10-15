import { IN_MS } from '../../shared/pray/line.ts'

// The terminal athan moment: a small Unicode minaret rising row by row above
// the prompt when a pray comes in. Pure frames; install.tsx plays them.

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
// How long the full minaret stays before it folds: the rise is about 3 s.
export const HOLD_MS = 700
// Frames 1 to ROWS_COUNT; frame n shows the n bottom rows.
export const ROWS_COUNT = MINARET.length
export const TOTAL_MS = ROWS_COUNT * FRAME_MS + HOLD_MS

// Restore the rise from its original clock, then keep one folded line.
export const minaretStage = (moment: { startedAt: number; foldsAt: number; until: number; isFolded: boolean }, now: number) => ({
  frame: Math.min(ROWS_COUNT, Math.max(1, Math.floor((now - moment.startedAt) / FRAME_MS) + 1)),
  isFolded: moment.isFolded || now >= moment.foldsAt,
  isGone: now >= moment.until,
})

// A pray first seen this long after its time is not announced: the same 15 minutes
// the footer keeps «حان وقت», so the line and the moment agree (a late tick, a reload).
export const FRESH_MS = IN_MS

// The seven rows at `frame`: built from the base up, unseen rows blank so the band keeps its height.
export const minaretRows = (frame: number): string[] =>
  MINARET.map((row, i) => (i >= ROWS_COUNT - frame ? row : ' '.repeat(row.length)))

// Whether the moment plays for the pray that came in at `at`: fresh and not yet shown.
export const isDue = (at: number, now: number, shownAt: number | null): boolean =>
  at <= now && now - at <= FRESH_MS && shownAt !== at

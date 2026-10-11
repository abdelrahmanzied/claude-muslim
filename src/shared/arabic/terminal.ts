import { arabicVisual } from './visual.ts'

export type ArabicFix = 'auto' | 'on' | 'off'
export const isArabicFix = (value: unknown): value is ArabicFix => value === 'auto' || value === 'on' || value === 'off'

// Conservative: TERM/xterm-256color does not identify a renderer. Unknown
// terminals keep logical text; use on for conhost or a Linux terminal
// without bidi/shaping. off means the terminal handles logical Arabic.
export const needsArabicVisual = (mode: ArabicFix, program?: string): boolean =>
  mode === 'on' || (mode === 'auto' && program === 'Apple_Terminal')

export const terminalArabic = (surface: string, mode: ArabicFix, text: string, program?: string): string =>
  surface === 'terminal' && needsArabicVisual(mode, program) ? arabicVisual(text) : text

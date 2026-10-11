import { arabicVisual } from './visual.ts'

export type ArabicTerminal = 'auto' | 'shaped' | 'plain'
export const isArabicTerminal = (value: unknown): value is ArabicTerminal => value === 'auto' || value === 'shaped' || value === 'plain'

// Conservative: TERM/xterm-256color does not identify a renderer. Unknown
// terminals keep logical text; use shaped for conhost or a Linux terminal
// without bidi/shaping. plain means the terminal handles logical Arabic.
export const needsArabicVisual = (mode: ArabicTerminal, program?: string): boolean =>
  mode === 'shaped' || (mode === 'auto' && program === 'Apple_Terminal')

export const terminalArabic = (surface: string, mode: ArabicTerminal, text: string, program?: string): string =>
  surface === 'terminal' && needsArabicVisual(mode, program) ? arabicVisual(text) : text

import { arabicJoined, arabicReordered, stripTashkeel } from './visual.ts'

export type ArabicMode = 'none' | 'plain' | 'joined' | 'reversed'

export const ARABIC_MODES: readonly ArabicMode[] = ['none', 'plain', 'joined', 'reversed']

export const isArabicMode = (value: unknown): value is ArabicMode =>
  value === 'none' || value === 'plain' || value === 'joined' || value === 'reversed'

export const defaultArabicMode = (termId: string): ArabicMode => {
  if (termId === 'Apple_Terminal') return 'plain'
  if (termId === 'WarpTerminal') return 'joined'

  return 'none'
}

export const terminalArabic = (surface: string, mode: ArabicMode, text: string): string => {
  if (surface !== 'terminal' || mode === 'none') return text
  if (mode === 'plain') return stripTashkeel(text)
  if (mode === 'joined') return arabicJoined(text)

  return arabicReordered(arabicJoined(text))
}

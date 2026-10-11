import { arabicJoined, arabicReordered, stripTashkeel } from './visual.ts'

export type ArabicMode = 'none' | 'plain' | 'joined' | 'reversed'

export const ARABIC_MODES: readonly ArabicMode[] = ['none', 'plain', 'joined', 'reversed']

export const isArabicMode = (value: unknown): value is ArabicMode =>
  value === 'none' || value === 'plain' || value === 'joined' || value === 'reversed'

export type TerminalEnvironment = {
  TERM_PROGRAM?: string
  TERMINAL_EMULATOR?: string
  __CFBundleIdentifier?: string
  WT_SESSION?: string
  KONSOLE_VERSION?: string
  VTE_VERSION?: string
  KITTY_WINDOW_ID?: string
  ALACRITTY_WINDOW_ID?: string
  ALACRITTY_SOCKET?: string
  OS?: string
}

export const terminalIdFromEnv = (env: TerminalEnvironment): string => {
  if (env.TERM_PROGRAM) return env.TERM_PROGRAM
  if (env.TERMINAL_EMULATOR) return env.TERMINAL_EMULATOR
  if (env.__CFBundleIdentifier) return env.__CFBundleIdentifier
  if (Object.prototype.hasOwnProperty.call(env, 'WT_SESSION')) return 'WindowsTerminal'
  if (env.KONSOLE_VERSION) return 'Konsole'
  if (env.VTE_VERSION) return 'VTE'
  if (env.KITTY_WINDOW_ID) return 'kitty'
  if (env.ALACRITTY_WINDOW_ID || env.ALACRITTY_SOCKET) return 'Alacritty'
  if (env.OS === 'Windows_NT') return 'WindowsConsole'

  return 'unknown'
}

export const defaultArabicMode = (termId: string): ArabicMode => {
  if (termId === 'Apple_Terminal') return 'plain'
  if (termId === 'WarpTerminal') return 'joined'
  if (termId === 'WindowsConsole') return 'reversed'

  return 'none'
}

export const terminalArabic = (surface: string, mode: ArabicMode, text: string): string => {
  if (surface !== 'terminal' || mode === 'none') return text
  if (mode === 'plain') return stripTashkeel(text)
  if (mode === 'joined') return arabicJoined(text)

  return arabicReordered(arabicJoined(text))
}

export type Accent = 'orange' | 'green' | 'yellow' | 'blue'

// The main color, for a light theme and a dark one.
export const ACCENTS: Record<Accent, { light: string; dark: string }> = {
  orange: { light: '#c8642d', dark: '#d97757' },
  green: { light: '#0b7a50', dark: '#1a9466' },
  yellow: { light: '#c99a1f', dark: '#e8b93c' },
  blue: { light: '#3a6aa3', dark: '#4a7fc0' },
}

export const isAccent = (value: unknown): value is Accent => typeof value === 'string' && Object.hasOwn(ACCENTS, value)

export const readColor = (value: unknown): Accent => isAccent(value) ? value : 'orange'

export const isDarkTheme = (theme: unknown): boolean => !String(theme ?? '').includes('light')

// Drawn surfaces need hex; text keeps Claude's exact theme key for orange.
export const accentHex = (color: Accent, isDark: boolean): string => ACCENTS[color][isDark ? 'dark' : 'light']
export const accentText = (color: Accent, theme: unknown): string => color === 'orange' ? 'claude' : accentHex(color, isDarkTheme(theme))

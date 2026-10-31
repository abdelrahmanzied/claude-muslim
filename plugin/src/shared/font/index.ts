// Shared Tajawal face for drawn desktop panes: Tajawal Regular (400) and Bold (700),
// as @font-face rules with the WOFF2 inlined as data URIs (SIL OFL: fonts/OFL.txt).
// Pure: no $. Used by the Muslim pane.

import { TAJAWAL_BOLD_WOFF2, TAJAWAL_REGULAR_WOFF2 } from './tajawal-embedded.ts'

export const TAJAWAL_FAMILY = 'Tajawal,sans-serif'

export const tajawalFontFaceCss = (): string =>
  `@font-face{font-family:Tajawal;font-weight:400;src:url(data:font/woff2;base64,${TAJAWAL_REGULAR_WOFF2}) format('woff2')}@font-face{font-family:Tajawal;font-weight:700;src:url(data:font/woff2;base64,${TAJAWAL_BOLD_WOFF2}) format('woff2')}`

// The family a drawn text uses, by its language. Arabic script gets the embedded Tajawal; every other
// language (Latin, Cyrillic, Vietnamese, Turkish...) takes the app's own sans-serif, which covers it.
// A language that needs its own embedded font adds a line here and its face to scripts/fonts/coverage.ts.
const FONT_BY_LANGUAGE: Readonly<Record<string, string>> = { ar: TAJAWAL_FAMILY, fa: TAJAWAL_FAMILY, ur: TAJAWAL_FAMILY }

export const fontFamilyFor = (lang: string | undefined): string => FONT_BY_LANGUAGE[(lang ?? '').toLowerCase().split('-')[0] ?? ''] ?? 'system-ui,sans-serif'

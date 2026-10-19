// Shared Tajawal face for drawn desktop panes: Tajawal Regular (400) and Bold (700),
// as @font-face rules with the WOFF2 inlined as data URIs (SIL OFL: fonts/OFL.txt).
// Pure: no $. Used by the Muslim pane.

import { TAJAWAL_BOLD_WOFF2, TAJAWAL_REGULAR_WOFF2 } from './tajawal-embedded.ts'

export const TAJAWAL_FAMILY = 'Tajawal,sans-serif'

export const tajawalFontFaceCss = (): string =>
  `@font-face{font-family:Tajawal;font-weight:400;src:url(data:font/woff2;base64,${TAJAWAL_REGULAR_WOFF2}) format('woff2')}@font-face{font-family:Tajawal;font-weight:700;src:url(data:font/woff2;base64,${TAJAWAL_BOLD_WOFF2}) format('woff2')}`

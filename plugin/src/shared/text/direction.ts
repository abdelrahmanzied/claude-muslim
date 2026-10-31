// Which way a text runs: from its language when given, else from its first letter. Pure.

export type Direction = 'rtl' | 'ltr'

// Languages written right to left (their primary subtag).
const RTL_LANGUAGES = new Set(['ar', 'fa', 'ur', 'he', 'yi', 'ps', 'sd', 'ug', 'ckb', 'dv'])

// Hebrew, Arabic, Syriac, Thaana, NKo and their presentation forms.
const RTL_LETTER = /[֐-ࣿיִ-﷿ﹰ-﻿]/u
const LETTER = /\p{L}/u

export const directionOf = (text: string, lang?: string): Direction => {
  if (lang) return RTL_LANGUAGES.has(lang.toLowerCase().split('-')[0] ?? '') ? 'rtl' : 'ltr'
  for (const ch of text) {
    if (RTL_LETTER.test(ch)) return 'rtl'
    if (LETTER.test(ch)) return 'ltr'
  }

  return 'ltr'
}

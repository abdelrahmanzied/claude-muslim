import { expect, test } from 'claude-code/testing'
import { stripTashkeel } from '../../../src/shared/arabic/visual.ts'
import { ayahInBrackets, JUMUAH_AYAH, JUMUAH_REF, jumuahVerse } from '../../../src/shared/friday/jumuah-ayah.ts'

const FRIDAY = new Date(2026, 9, 9, 12, 30).getTime(), SATURDAY = new Date(2026, 9, 10, 12, 30).getTime()

test('the verse is Surat al-Jumu\'ah 62:9, its words as authored', () => {
  const bare = stripTashkeel(JUMUAH_AYAH).replace(/\s+/g, ' ')
  expect(bare).toBe('يا أيها الذين آمنوا إذا نودي للصلاة من يوم الجمعة فاسعوا إلى ذكر الله وذروا البيع ذلكم خير لكم إن كنتم تعلمون')
  // With its tashkeel, and its stop sign.
  expect(JUMUAH_AYAH).toMatch(/[\u064b-\u0652]/)
  expect(JUMUAH_AYAH).toContain('\u06da')
  expect(JUMUAH_REF).toBe('سورة الجمعة · الآية ٩')
})

test('the brackets open at the right (U+FD3F) and close at the left (U+FD3E)', () => {
  const shown = ayahInBrackets(JUMUAH_AYAH)
  expect(shown.startsWith('\ufd3f')).toBe(true)
  expect(shown.endsWith('\ufd3e')).toBe(true)
  expect(shown.slice(1, -1)).toBe(JUMUAH_AYAH)
})

test('only Dhuhr on a Friday has the verse', () => {
  expect(jumuahVerse('dhuhr', FRIDAY)).toEqual({ text: JUMUAH_AYAH, ref: JUMUAH_REF })
  for (const pray of ['fajr', 'asr', 'maghrib', 'isha'] as const) expect(jumuahVerse(pray, FRIDAY)).toBeNull()
  expect(jumuahVerse('dhuhr', SATURDAY)).toBeNull()
})

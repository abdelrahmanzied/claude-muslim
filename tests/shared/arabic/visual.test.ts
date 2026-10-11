import { describe, expect, test } from 'claude-code/testing'
import { arabicJoined, arabicReordered, arabicVisual, stripTashkeel } from '../../../src/shared/arabic/visual.ts'
import { defaultArabicMode, terminalArabic } from '../../../src/shared/arabic/terminal.ts'
import { END_OF_TURN, LONG, SALAWAT, STARTING, THINKING, USAGE_LIMIT, WRITING } from '../../../src/features/thikr/phrases.ts'

// Escapes express physical left-to-right cell order, independent of this
// editor's bidi support. These fixtures are not made by the implementation.
describe('Arabic contextual forms', () => {
  test('isolated, initial, medial and final forms', () => {
    expect(arabicVisual('ب')).toBe('\ufe8f')
    expect(arabicVisual('ببب')).toBe('\ufe90\ufe92\ufe91')
    expect(arabicVisual('ء')).toBe('\ufe80')
    expect(arabicVisual('بدب')).toBe('\ufe8f\ufeaa\ufe91')
    expect(arabicVisual('ب ب')).toBe('\ufe8f \ufe8f')
    expect(arabicVisual('ىىى')).toBe('\ufef0\ufbe9\ufbe8')
    expect(arabicVisual('ةى')).toBe('\ufeef\ufe93')
  })
  test('all four lam-alef ligatures, isolated and joined to a previous letter', () => {
    expect(arabicVisual('لا لأ لإ لآ')).toBe('\ufef5 \ufef9 \ufef7 \ufefb')
    expect(arabicVisual('بلا بلأ بلإ بلآ')).toBe('\ufef6\ufe91 \ufefa\ufe91 \ufef8\ufe91 \ufefc\ufe91')
    expect(arabicVisual('لَا')).toBe('\ufefb')
  })
  test('drops tashkeel without blocking joining; composes hamza and madda first', () => {
    expect(arabicVisual('بَِّبْبٌ')).toBe('\ufe90\ufe92\ufe91')
    expect(arabicVisual('ا\u0654 ا\u0655 ا\u0653')).toBe('\ufe81 \ufe87 \ufe83')
    expect(arabicVisual('ب\u0670ب')).toBe('\ufe90\ufe91')
  })
  test('tatweel joins; join controls are respected then removed', () => {
    expect(arabicVisual('بـب')).toBe('\ufe90ـ\ufe91')
    expect(arabicVisual('ب\u200cب')).toBe('\ufe8f\ufe8f')
    expect(arabicVisual('ب\u200dب')).toBe('\ufe90\ufe91')
  })
})

describe('RTL visual order', () => {
  test('the reported footer keeps Arabic-Indic HH:MM left to right', () => {
    expect(arabicVisual('العشاء ٠٣:٢٨')).toBe('٠٣:٢٨ \ufe80\ufe8e\ufeb8\ufecc\ufedf\ufe8d')
    expect(arabicVisual('☾ العشاء ٠٣:٢٨')).toBe('٠٣:٢٨ \ufe80\ufe8e\ufeb8\ufecc\ufedf\ufe8d ☾')
  })
  test('the reported spinner preserves its exact words', () => {
    expect(arabicVisual('تم يحفظ الله')).toBe('\ufeea\ufee0\ufedf\ufe8d \ufec6\ufed4\ufea4\ufef3 \ufee2\ufe97')
    expect(arabicVisual('تَمَّ بِحَمْدِ اللَّهِ')).toBe('\ufeea\ufee0\ufedf\ufe8d \ufeaa\ufee4\ufea4\ufe91 \ufee2\ufe97')
  })
  test('Latin, ASCII and extended Arabic-Indic numbers keep their run order', () => {
    expect(arabicVisual('ب 03:28 ت')).toBe('\ufe95 03:28 \ufe8f')
    expect(arabicVisual('ب ۰۳:۲۸ ت')).toBe('\ufe95 ۰۳:۲۸ \ufe8f')
    expect(arabicVisual('ب abc 12 ت')).toBe('\ufe95 abc 12 \ufe8f')
    expect(arabicVisual('ب abc def ت')).toBe('\ufe95 abc def \ufe8f')
    expect(arabicVisual('ب ١٢/٣٤ ت')).toBe('\ufe95 ١٢/٣٤ \ufe8f')
    expect(arabicVisual('ب ١٢.٣٤ ت')).toBe('\ufe95 ١٢.٣٤ \ufe8f')
  })
  test('separate number runs, neutral separators and paired brackets', () => {
    expect(arabicVisual('ب ١٢ ٣٤ ت')).toBe('\ufe95 ٣٤ ١٢ \ufe8f')
    expect(arabicVisual('ب · ت')).toBe('\ufe95 · \ufe8f')
    expect(arabicVisual('ب (١٢:٣٤) ت')).toBe('\ufe95 (١٢:٣٤) \ufe8f')
    expect(arabicVisual('ب (abc) ت')).toBe('\ufe95 (abc) \ufe8f')
    expect(arabicVisual('ب abc (def) ت')).toBe('\ufe95 abc (def) \ufe8f')
    expect(arabicVisual('ب!')).toBe('!\ufe8f')
  })
  test('handles each line separately and preserves empty/non-Arabic strings', () => {
    expect(arabicVisual('')).toBe('')
    expect(arabicVisual('Editing app.ts · 3s')).toBe('Editing app.ts · 3s')
    expect(arabicVisual('ب\nت\n')).toBe('\ufe8f\n\ufe95\n')
    expect(arabicVisual('ب e\u0301 ت')).toBe('\ufe95 é \ufe8f')
  })
  test('all authored phrases keep the same letters after presentation normalization', () => {
    for (const phrase of [...STARTING, ...THINKING, ...WRITING, ...LONG, ...SALAWAT, END_OF_TURN, USAGE_LIMIT]) {
      const letters = (text: string) => Array.from(text.normalize('NFKC')).filter(char => /\p{L}/u.test(char)).sort().join('')
      expect(letters(arabicVisual(phrase))).toBe(letters(phrase))
    }
  })
})

test('split transformations preserve logical order until the reorder step', () => {
  expect(stripTashkeel('بِسْمِ اللَّهِ')).toBe('بسم الله')
  expect(arabicJoined('ببب')).toBe('\ufe91\ufe92\ufe90')
  expect(arabicReordered(arabicJoined('ببب'))).toBe('\ufe90\ufe92\ufe91')
})

test('modes transform terminal text and leave every non-terminal surface unchanged', () => {
  const text = 'بِبِبِ'
  expect(terminalArabic('terminal', 'none', text)).toBe(text)
  expect(terminalArabic('terminal', 'plain', text)).toBe('ببب')
  expect(terminalArabic('terminal', 'joined', text)).toBe('\ufe91\ufe92\ufe90')
  expect(terminalArabic('terminal', 'reversed', text)).toBe('\ufe90\ufe92\ufe91')
  for (const surface of ['desktop', 'mobile', 'vscode']) {
    for (const mode of ['none', 'plain', 'joined', 'reversed'] as const) expect(terminalArabic(surface, mode, text)).toBe(text)
  }
})

test('built-in defaults are specific to known terminals', () => {
  expect(defaultArabicMode('Apple_Terminal')).toBe('plain')
  expect(defaultArabicMode('WarpTerminal')).toBe('joined')
  for (const termId of ['unknown', 'iTerm.app', 'xterm']) expect(defaultArabicMode(termId)).toBe('none')
})

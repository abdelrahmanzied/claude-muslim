// Only digits change; authored words and punctuation stay intact.
const DIGITS = '٠١٢٣٤٥٦٧٨٩'
export const arabicDigits = (value: number | string): string => String(value).replace(/\d/g, digit => DIGITS[Number(digit)]!)
export const latinDigits = (value: string): string => value.replace(/[٠-٩]/g, digit => String(DIGITS.indexOf(digit)))

// A whole number as typed: Latin, Arabic-Indic (٠–٩) or Persian (۰–۹) digits, and one
// leading sign (-, − or +) only where `min` is below zero. Anything else, or a number
// outside min…max, is undefined: not saved.
export const typedInteger = (text: string, min: number, max: number): number | undefined => {
  const plain = text.trim().replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0)).replace(/−/g, '-')
  if (!(min < 0 ? /^[+-]?[0-9٠-٩]+$/ : /^[0-9٠-٩]+$/).test(plain)) return undefined
  const value = Number(latinDigits(plain))
  return Number.isSafeInteger(value) && value >= min && value <= max ? value : undefined
}

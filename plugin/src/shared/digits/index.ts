// Only digits change; authored words and punctuation stay intact.
const DIGITS = '٠١٢٣٤٥٦٧٨٩'
export const arabicDigits = (value: number | string): string => String(value).replace(/\d/g, digit => DIGITS[Number(digit)]!)
export const latinDigits = (value: string): string => value.replace(/[٠-٩]/g, digit => String(DIGITS.indexOf(digit)))

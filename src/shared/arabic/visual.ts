// Display only: basic Arabic shaping and UAX #9 weak/neutral resolution for
// one RTL line. No authored text or stored value should be replaced with this.
// Forms are isolated, final, initial, medial; absent forms cannot join forward.
const FORMS: Record<string, string> = {
  'ء': 'ﺀ', 'آ': 'ﺁﺂ', 'أ': 'ﺃﺄ', 'ؤ': 'ﺅﺆ', 'إ': 'ﺇﺈ', 'ئ': 'ﺉﺊﺋﺌ',
  'ا': 'ﺍﺎ', 'ب': 'ﺏﺐﺑﺒ', 'ة': 'ﺓﺔ', 'ت': 'ﺕﺖﺗﺘ', 'ث': 'ﺙﺚﺛﺜ',
  'ج': 'ﺝﺞﺟﺠ', 'ح': 'ﺡﺢﺣﺤ', 'خ': 'ﺥﺦﺧﺨ', 'د': 'ﺩﺪ', 'ذ': 'ﺫﺬ',
  'ر': 'ﺭﺮ', 'ز': 'ﺯﺰ', 'س': 'ﺱﺲﺳﺴ', 'ش': 'ﺵﺶﺷﺸ', 'ص': 'ﺹﺺﺻﺼ',
  'ض': 'ﺽﺾﺿﻀ', 'ط': 'ﻁﻂﻃﻄ', 'ظ': 'ﻅﻆﻇﻈ', 'ع': 'ﻉﻊﻋﻌ', 'غ': 'ﻍﻎﻏﻐ',
  'ف': 'ﻑﻒﻓﻔ', 'ق': 'ﻕﻖﻗﻘ', 'ك': 'ﻙﻚﻛﻜ', 'ل': 'ﻝﻞﻟﻠ', 'م': 'ﻡﻢﻣﻤ',
  'ن': 'ﻥﻦﻧﻨ', 'ه': 'ﻩﻪﻫﻬ', 'و': 'ﻭﻮ', 'ى': 'ﻯﻰﯨﯩ', 'ي': 'ﻱﻲﻳﻴ',
  'ٱ': 'ﭐﭑ', 'پ': 'ﭖﭗﭘﭙ', 'چ': 'ﭺﭻﭼﭽ', 'ژ': 'ﮊﮋ', 'ک': 'ﮎﮏﮐﮑ',
  'گ': 'ﮒﮓﮔﮕ', 'ی': 'ﯼﯽﯾﯿ', 'ـ': 'ــــ', '\u200d': '\u200d\u200d\u200d\u200d',
  'ﻵ': 'ﻵﻶ', 'ﻷ': 'ﻷﻸ', 'ﻹ': 'ﻹﻺ', 'ﻻ': 'ﻻﻼ',
}
const LAM_ALEF: Record<string, string> = { 'آ': 'ﻵ', 'أ': 'ﻷ', 'إ': 'ﻹ', 'ا': 'ﻻ' }
const ARABIC_MARKS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7-\u06e8\u06ea-\u06ed]/g
const HAS_ARABIC = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/
const MIRROR: Record<string, string> = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<', '«': '»', '»': '«' }
const CLOSE: Record<string, string> = { '(': ')', '[': ']', '{': '}', '«': '»' }
type Kind = 'AL' | 'R' | 'L' | 'AN' | 'EN' | 'ES' | 'CS' | 'ET' | 'N'

const kindOf = (char: string): Kind => {
  if (/[٠-٩]/.test(char)) return 'AN'
  if (/[0-9۰-۹]/.test(char)) return 'EN'
  if (/[\u0590-\u05ff]/.test(char)) return 'R'
  if (HAS_ARABIC.test(char) && /\p{L}/u.test(char)) return 'AL'
  if (/\p{L}/u.test(char)) return 'L'
  if (char === '+' || char === '-') return 'ES'
  if (/[,:.\u060c\u066b\u066c/]/.test(char)) return 'CS'
  if (/[#$%\u066a]/.test(char)) return 'ET'

  return 'N'
}

const shape = (text: string): string[] => {
  // Compose hamza/madda first: removing a combining hamza must not change a word.
  const chars = Array.from(text.normalize('NFC').replace(ARABIC_MARKS, ''))
  const letters: string[] = []
  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i]!
    const ligature = char === 'ل' ? LAM_ALEF[chars[i + 1] ?? ''] : undefined
    letters.push(ligature ?? char)
    if (ligature) i += 1
  }
  return letters.map((char, i) => {
    const forms = FORMS[char]
    if (!forms) return char
    const previous = FORMS[letters[i - 1] ?? '']
    const following = FORMS[letters[i + 1] ?? '']
    const back = !!previous && previous.length === 4 && forms.length >= 2
    const forward = forms.length === 4 && !!following && following.length >= 2

    return forms[back ? (forward ? 3 : 1) : (forward ? 2 : 0)] ?? char
  }).filter(char => char !== '\u200c' && char !== '\u200d')
}

const reorderLine = (text: string): string => {
  if (!HAS_ARABIC.test(text)) return text
  const chars = Array.from(text)
  // Keep non-Arabic combining marks attached to their base when reversing.
  const clusters: string[] = []
  for (const char of chars) {
    if (/\p{M}/u.test(char) && clusters.length) clusters[clusters.length - 1] += char
    else clusters.push(char)
  }
  const kinds = clusters.map(char => kindOf(Array.from(char)[0]!))
  // W2/W3: European numbers after Arabic remain numbers; AL becomes R.
  let strong: Kind = 'R'
  for (let i = 0; i < kinds.length; i += 1) {
    const kind = kinds[i]!
    if (kind === 'EN' && strong === 'AL') kinds[i] = 'AN'
    if (kind === 'AL' || kind === 'R' || kind === 'L') strong = kind
    if (kind === 'AL') kinds[i] = 'R'
  }
  // W4: numeric separators stay in their number run (including HH:MM).
  for (let i = 1; i < kinds.length - 1; i += 1) {
    const before = kinds[i - 1], after = kinds[i + 1]
    if (before === after && ((kinds[i] === 'CS' && (before === 'AN' || before === 'EN')) || (kinds[i] === 'ES' && before === 'EN'))) kinds[i] = before!
  }
  // W5/W6: currency/percent next to EN; other separators become neutral.
  for (let i = 0; i < kinds.length; i += 1) {
    if (kinds[i] !== 'ET') continue
    let end = i
    while (kinds[end] === 'ET') end += 1
    const resolved = kinds[i - 1] === 'EN' || kinds[end] === 'EN' ? 'EN' : 'N'
    for (; i < end; i += 1) kinds[i] = resolved
    i -= 1
  }
  for (let i = 0; i < kinds.length; i += 1) if (kinds[i] === 'ES' || kinds[i] === 'CS') kinds[i] = 'N'
  // W7: EN after Latin is L.
  strong = 'R'
  for (let i = 0; i < kinds.length; i += 1) {
    if (kinds[i] === 'R' || kinds[i] === 'L') strong = kinds[i]!
    else if (kinds[i] === 'EN' && strong === 'L') kinds[i] = 'L'
  }
  const direction = (kind: Kind): 'R' | 'L' => kind === 'L' ? 'L' : 'R'
  // N0: paired brackets take the enclosed direction, with RTL embedding.
  const stack: number[] = []
  for (let i = 0; i < clusters.length; i += 1) {
    const char = clusters[i]!
    if (CLOSE[char]) stack.push(i)
    else {
      const match = stack.findLastIndex(start => CLOSE[clusters[start]!] === char)
      if (match < 0) continue
      const start = stack[match]!
      stack.splice(match)
      const enclosed = kinds.slice(start + 1, i).filter(kind => kind !== 'N')
      if (!enclosed.length) continue
      let resolved: Kind = 'R'
      if (!enclosed.some(kind => direction(kind) === 'R')) {
        let preceding: Kind = 'R'
        for (let j = start - 1; j >= 0; j -= 1) if (kinds[j] !== 'N') { preceding = kinds[j]!; break }
        resolved = direction(preceding)
      }
      kinds[start] = resolved
      kinds[i] = resolved
    }
  }
  // N1/N2: neutrals between equal directions take that direction; else RTL.
  for (let i = 0; i < kinds.length; i += 1) {
    if (kinds[i] !== 'N') continue
    let end = i
    while (kinds[end] === 'N') end += 1
    const before = direction(kinds[i - 1] ?? 'R'), after = direction(kinds[end] ?? 'R')
    for (; i < end; i += 1) kinds[i] = before === after ? before : 'R'
    i -= 1
  }
  // I2/L2: base level 1; Latin/numbers at level 2. Reverse level 2 runs,
  // then the whole level 1 line; numbers and Latin therefore remain LTR.
  const levels = kinds.map(kind => kind === 'R' ? 1 : 2)
  const output = clusters.map((char, i) => levels[i] === 1 ? MIRROR[char] ?? char : char)
  for (let i = 0; i < output.length; i += 1) {
    if (levels[i] !== 2) continue
    let end = i
    while (levels[end] === 2) end += 1
    output.splice(i, end - i, ...output.slice(i, end).reverse())
    i = end - 1
  }

  return output.reverse().join('')
}

// Shaping and visual reordering are independent so terminals that handle bidi
// themselves can receive joined forms in their normal logical order.
export const stripTashkeel = (text: string): string => text.replace(ARABIC_MARKS, '')

export const arabicJoined = (text: string): string => text.split('\n').map(line => shape(line).join('')).join('\n')

// Basic single-line RTL paragraphs; explicit bidi embeddings/isolates and
// automatic wrapping are outside this display fallback's contract.
export const arabicReordered = (text: string): string => text.split('\n').map(reorderLine).join('\n')

export const arabicVisual = (text: string): string => arabicReordered(arabicJoined(text))

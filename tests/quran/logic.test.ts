import { expect, test } from 'claude-code/testing'
import { audioUrl, defaultReciter, filterReciters, isCatalog, matchReciter, matchSurah, normalizeName, readSurahs, resultRows, searchReciters, searchSurahs } from '../../src/features/quran/catalog.ts'
import { formatTime, nextSurahAfterEnd, parseCommand, progressBar } from '../../src/features/quran/player.ts'
import { quranHelp } from '../../src/features/quran/help.ts'
import { fixtureCatalog, reciters, surahs } from './fixtures/catalog.ts'

test('surah names ignore tashkeel, hamza forms, article and spaces', () => {
  for (const name of ['الكهف', 'كهف', 'الْكَهْف', '18']) expect(matchSurah(name, surahs)?.id).toBe(18)
  expect(matchSurah('ال بقرة', surahs)?.id).toBe(2)
  expect(matchSurah('ال بَقَرَة', surahs)?.id).toBe(2)
  expect(matchSurah('آل عمران', surahs)?.id).toBe(3)
  expect(normalizeName('أ إ آ ٱ ؤ ئ')).toBe('ااااوي')
  for (const name of ['0', '115', '1.5', 'missing', '']) expect(matchSurah(name, surahs)).toBeUndefined()
})
test('each complete Hafs moshaf is separate, labels preserve authored names', () => {
  const choices = filterReciters(reciters)
  expect(choices.map(r => r.key)).toEqual(['10:20', '10:21', '11:24'])
  expect(choices.map(r => r.label)).toEqual(['محمد صديق المنشاوي — مرتل', 'محمد صديق المنشاوي — مجود', 'عبد الباسط عبد الصمد — حفص عن عاصم'])
  expect(defaultReciter(fixtureCatalog).key).toBe('10:20')
  expect(defaultReciter({ ...fixtureCatalog, reciters: choices.slice(1) }).key).toBe('10:21')
  expect(matchReciter('2', choices)?.key).toBe('10:21')
  expect(matchReciter('محمد صديق المنشاوي', choices)).toBeUndefined()
  expect(matchReciter('محمد صديق المنشاوي — مرتل', choices)?.key).toBe('10:20')
  expect(matchReciter('عبدالباسط عبدالصمد', choices)?.key).toBe('11:24')
  expect(filterReciters({ reciters: [null, {}] })).toEqual([])
  expect(isCatalog(fixtureCatalog)).toBe(true)
  expect(isCatalog({ ...fixtureCatalog, surahs: [] })).toBe(false)
  expect(readSurahs({ suwar: [...surahs.slice(1), surahs[113]] })).toEqual([])
})
test('whole-surah URLs have three digits', () => {
  expect(audioUrl(defaultReciter(fixtureCatalog), 18)).toBe('https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/018.mp3')
  expect(audioUrl(defaultReciter(fixtureCatalog), 1)).toContain('/001.mp3')
  expect(audioUrl(defaultReciter(fixtureCatalog), 114)).toContain('/114.mp3')
})
test('time and fixed-width progress handle unknown, hour-long and bounded values', () => {
  expect(formatTime(null)).toBe('--:--')
  expect(formatTime(61000)).toBe('01:01')
  expect(formatTime(3600000)).toBe('1:00:00')
  expect(formatTime(3661000)).toBe('1:01:01')
  expect(formatTime(-1)).toBe('00:00')
  expect(progressBar(500, 1000)).toBe('━'.repeat(12) + '─'.repeat(12))
  expect(progressBar(10000, null)).toBe('─'.repeat(24))
  expect(progressBar(2000, 1000)).toBe('━'.repeat(24))
  expect(progressBar(-1, 1000)).toBe('─'.repeat(24))
})
test('command grammar accepts only the supported v1 actions', () => {
  expect(parseCommand('')).toEqual({ kind: 'open' })
  expect(parseCommand('play آل عمران')).toEqual({ kind: 'play', value: 'آل عمران' })
  expect(parseCommand('reciter')).toEqual({ kind: 'reciter', value: '' })
  for (const word of ['stop', 'help', 'next', 'prev']) expect(parseCommand(word).kind).toBe(word)
  expect(quranHelp()).toContain('/quran play <surah>')
  for (const args of ['play', 'stop now', 'pause', 'seek 10', 'unknown']) expect(parseCommand(args)).toEqual({ kind: 'usage' })
  expect(quranHelp()).toContain('advance on natural end')
})

test('auto-advance only follows a natural end of the active generation and stops at 114', () => {
  expect(nextSurahAfterEnd(1, true, 7, 7)).toBe(2)
  expect(nextSurahAfterEnd(18, true, 7, 7)).toBe(19)
  expect(nextSurahAfterEnd(113, true, 7, 7)).toBe(114)
  expect(nextSurahAfterEnd(114, true, 7, 7)).toBe(null)
  expect(nextSurahAfterEnd(18, false, 7, 7)).toBe(null)
  expect(nextSurahAfterEnd(18, true, 7, 8)).toBe(null)
  for (const surah of [0, 115, 1.5]) expect(nextSurahAfterEnd(surah, true, 7, 7)).toBe(null)
})

test('search preserves article letters, normalizes Arabic and searches names and recording labels', () => {
  expect(searchReciters('مُنْشَاوِي', fixtureCatalog.reciters)).toHaveLength(2)
  expect(searchReciters('مجود', fixtureCatalog.reciters)[0]?.key).toBe('10:21')
  const salih = { ...fixtureCatalog.reciters[0]!, name: 'صالح', label: 'صالح — مرتل' }
  expect(searchReciters('صالح', [salih])).toEqual([salih])
  expect(searchReciters('صح', [salih])).toEqual([])
  expect(searchSurahs('كهف', surahs)[0]?.id).toBe(18)
  expect(searchSurahs('الْكَهْف', surahs)[0]?.id).toBe(18)
  expect(searchSurahs('ال بقرة', surahs)[0]?.id).toBe(2)
  expect(searchSurahs('18', surahs).map(s => s.id)).toEqual([18])
  expect(searchSurahs('١١٤', surahs).map(s => s.id)).toEqual([114])
  expect(searchSurahs('1', surahs).map(s => s.id)).toEqual([1])
  expect(searchSurahs('115', surahs)).toEqual([])
  expect(searchSurahs('', surahs)).toEqual([])
  expect(searchReciters('  ', fixtureCatalog.reciters)).toEqual([])
  expect(resultRows(Array.from({ length: 155 }, (_, i) => i))).toEqual([0, 1, 2, 3, 4, 5])
})

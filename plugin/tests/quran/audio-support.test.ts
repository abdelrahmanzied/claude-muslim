import { expect, test } from 'claude-code/testing'
import { AUDIO_WORKS_KEY, audioNote, audioOsOf, browserUrl, openArgv } from '../../src/features/quran/audio-support.ts'
import { NOT_PLAYED_FLOOR_MS, isNotPlayedError, notPlayedError, playedThrough } from '../../src/features/quran/player.ts'

test('a clip counts as played from half its known length, or 10 seconds when unknown', () => {
  expect(NOT_PLAYED_FLOOR_MS).toBe(10000)
  expect(playedThrough(0, 60000)).toBe(false)
  expect(playedThrough(29999, 60000)).toBe(false)
  expect(playedThrough(30000, 60000)).toBe(true)
  expect(playedThrough(61000, 60000)).toBe(true)
  for (const unknown of [null, undefined, 0, -5, Number.NaN]) {
    expect(playedThrough(9999, unknown)).toBe(false)
    expect(playedThrough(10000, unknown)).toBe(true)
  }
  expect(playedThrough(Number.NaN, 60000)).toBe(false)
})

test('the not-played line names the surah or its quarter and is recognised as known', () => {
  expect(notPlayedError('الفاتحة', false)).toBe('تعذّر سماع سورة الفاتحة، لم يبدأ الصوت. أعد المحاولة.')
  expect(notPlayedError('البقرة', true)).toBe('تعذّر سماع هذا المقطع من سورة البقرة، لم يبدأ الصوت. أعد المحاولة.')
  expect(isNotPlayedError(notPlayedError('الكهف', false))).toBe(true)
  expect(isNotPlayedError(notPlayedError('البقرة', true))).toBe(true)
  expect(isNotPlayedError('Quran: tعذّر')).toBe(false)
})

test('only Windows and Linux are named; macOS and unknown get no note', () => {
  expect(audioOsOf('Windows_NT', undefined)).toBe('Windows')
  expect(audioOsOf(undefined, 'Linux\n')).toBe('Linux')
  expect(audioOsOf(undefined, 'Darwin\n')).toBe(null)
  expect(audioOsOf(undefined, undefined)).toBe(null)
  expect(audioOsOf(undefined, '')).toBe(null)
})

test('the note shows until a clip really played on this Claude Code version', () => {
  expect(AUDIO_WORKS_KEY).toBe('quran.audioWorks')
  expect(audioNote('Windows', undefined, '2.1.306')).toBe('الصوت غير مدعوم على Windows بعد')
  expect(audioNote('Linux', undefined, '2.1.306')).toBe('الصوت غير مدعوم على Linux بعد')
  expect(audioNote('Windows', '2.1.306', '2.1.306')).toBe('')
  expect(audioNote('Windows', '2.1.305', '2.1.306')).toBe('الصوت غير مدعوم على Windows بعد')
  expect(audioNote('Linux', '2.1.306', undefined)).toBe('الصوت غير مدعوم على Linux بعد')
  expect(audioNote(null, undefined, '2.1.306')).toBe('')
})

test('the browser gets the surah MP3, with the quarter as a media fragment', () => {
  const url = 'https://server8.mp3quran.net/minsh/002.mp3'
  expect(browserUrl(url)).toBe(url)
  expect(browserUrl(url, { startMs: 65_400, endMs: 130_900 })).toBe(`${url}#t=65,131`)
  expect(browserUrl(url, { startMs: 0, endMs: 2000 })).toBe(`${url}#t=0,2`)
  expect(browserUrl(url, { startMs: 5000, endMs: 5000 })).toBe(url)
  expect(browserUrl(url, { startMs: Number.NaN, endMs: 5000 })).toBe(url)
})

test('the default browser opens through start on Windows and xdg-open on Linux, plain https only', () => {
  const url = 'https://server8.mp3quran.net/minsh/002.mp3#t=65,131'
  expect(openArgv('Windows', url)).toEqual(['cmd', '/d', '/c', 'start', '', url])
  expect(openArgv('Linux', url)).toEqual(['xdg-open', url])
  for (const bad of ['http://x.test/a.mp3', 'https://x.test/a.mp3&calc', 'https://x.test/a b.mp3', 'https://x.test/%41.mp3', 'file:///etc/passwd']) {
    expect(openArgv('Windows', bad)).toBe(null)
    expect(openArgv('Linux', bad)).toBe(null)
  }
})

import { describe, expect, test } from 'claude-code/testing'

import { limitUntil } from '../../src/features/thikr/limit.ts'
import { STARTING, THINKING, WRITING } from '../../src/features/thikr/phrases.ts'
import { display, groupFor, phraseAt, stripTashkeel } from '../../src/features/thikr/rotation.ts'

describe('groupFor', () => {
  test('requesting starts a turn, then reads as thinking', async () => {
    expect(groupFor('requesting', false)).toBe('starting')
    expect(groupFor('requesting', true)).toBe('thinking')
  })

  test('tools count as thinking, responding as writing', async () => {
    expect(groupFor('thinking', true)).toBe('thinking')
    expect(groupFor('tool-use', true)).toBe('thinking')
    expect(groupFor('tool-input', true)).toBe('thinking')
    expect(groupFor('responding', true)).toBe('writing')
  })
})

describe('phraseAt', () => {
  test('plays the list in order, one step per speed', async () => {
    expect(phraseAt('thinking', 0, 3)).toBe(THINKING[0])
    expect(phraseAt('thinking', 2999, 3)).toBe(THINKING[0])
    expect(phraseAt('thinking', 3000, 3)).toBe(THINKING[1])
    expect(phraseAt('thinking', 9000, 3)).toBe(THINKING[3])
  })

  test('wraps around after the last phrase', async () => {
    expect(phraseAt('thinking', THINKING.length * 3000, 3)).toBe(THINKING[0])
    expect(phraseAt('starting', STARTING.length * 2000, 2)).toBe(STARTING[0])
  })

  test('writing is salawat only', async () => {
    expect(phraseAt('writing', 0, 3)).toBe(WRITING[0])
    expect(phraseAt('writing', 60_000, 3)).toBe(WRITING[0])
  })
})

describe('tashkeel', () => {
  test('strips marks and keeps letters', async () => {
    expect(stripTashkeel('سُبْحَانَ اللَّهِ')).toBe('سبحان الله')
    expect(stripTashkeel('لَا إِلَٰهَ إِلَّا اللَّهُ')).toBe('لا إله إلا الله')
  })

  test('display keeps the original when tashkeel is on', async () => {
    expect(display('سُبْحَانَ اللَّهِ', true)).toBe('سُبْحَانَ اللَّهِ')
    expect(display('سُبْحَانَ اللَّهِ', false)).toBe('سبحان الله')
  })
})

describe('limitUntil', () => {
  test('latest reset among full windows', async () => {
    expect(limitUntil([
      { percentUsed: 100, resetsAt: '2026-10-10T18:00:00Z' },
      { percentUsed: 100, resetsAt: '2026-10-11T00:00:00Z' },
      { percentUsed: 40, resetsAt: '2026-10-12T00:00:00Z' },
    ])).toBe(Date.parse('2026-10-11T00:00:00Z'))
  })

  test('no full window is a passing throttle', async () => {
    expect(limitUntil([{ percentUsed: 80, resetsAt: '2026-10-10T18:00:00Z' }])).toBeUndefined()
  })

  test('unknown windows or reset time clear on the next turn', async () => {
    expect(limitUntil([])).toBeNull()
    expect(limitUntil([{ percentUsed: 100 }])).toBeNull()
  })
})

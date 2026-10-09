import { describe, expect, test } from 'claude-code/testing'

import { limitUntil } from '../../src/features/thikr/limit.ts'
import { STARTING, THINKING } from '../../src/features/thikr/phrases.ts'
import { display, groupFor, phraseAt, stripTashkeel, withThikr } from '../../src/features/thikr/rotation.ts'

describe('groupFor', () => {
  test('requesting starts a turn, then reads as thinking', async () => {
    expect(groupFor('requesting', false)).toBe('starting')
    expect(groupFor('requesting', true)).toBe('thinking')
  })

  test('thinking, tools and writing share one order', async () => {
    for (const mode of ['thinking', 'tool-use', 'tool-input', 'responding'] as const) {
      expect(groupFor(mode, true)).toBe('thinking')
    }
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

  test('salawat closes the thinking order', async () => {
    expect(THINKING[THINKING.length - 1]).toBe('اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ')
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

describe('withThikr', () => {
  const thikr = 'سُبْحَانَ اللَّهِ'

  test('terminal: the thikr replaces the decorative verb', async () => {
    expect(withThikr('terminal', { word: 'Sauteing', message: null }, thikr)).toEqual({ word: thikr, message: null })
  })

  test('desktop: Claude\'s step stays, the thikr follows', async () => {
    expect(withThikr('desktop', { word: 'Editing app.ts', message: null }, thikr))
      .toEqual({ word: `Editing app.ts · ${thikr}`, message: null })
  })

  test('desktop: a generic word is replaced', async () => {
    expect(withThikr('desktop', { word: 'Working', message: null }, thikr)).toEqual({ word: thikr, message: null })
  })

  test('a status message is kept on every surface', async () => {
    expect(withThikr('terminal', { word: 'Sauteing', message: 'Compacting conversation' }, thikr))
      .toEqual({ word: thikr, message: `Compacting conversation · ${thikr}` })
  })
})

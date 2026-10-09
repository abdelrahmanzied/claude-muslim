import { describe, expect, test } from 'claude-code/testing'

import { limitUntil } from '../../src/features/thikr/limit.ts'
import { readSpeed } from '../../src/config.ts'
import { LONG, STARTING, THINKING } from '../../src/features/thikr/phrases.ts'
import {
  display,
  durationOf,
  groupFor,
  LONG_TOOL_MS,
  phraseAt,
  pickStart,
  startOf,
  stripTashkeel,
  isStepRow,
  withThikr,
  wordCount,
} from '../../src/features/thikr/rotation.ts'

const moment = { mode: 'thinking' as const, hasMovedOn: true, isCompacting: false, hasSubagent: false, toolRunMs: 0 }

describe('groupFor', () => {
  test('requesting starts a turn, then reads as thinking', async () => {
    expect(groupFor({ ...moment, mode: 'requesting', hasMovedOn: false })).toBe('starting')
    expect(groupFor({ ...moment, mode: 'requesting' })).toBe('thinking')
  })

  test('thinking and tools share one order', async () => {
    for (const mode of ['thinking', 'tool-use', 'tool-input'] as const) {
      expect(groupFor({ ...moment, mode })).toBe('thinking')
    }
  })

  test('writing the answer has its own group', async () => {
    expect(groupFor({ ...moment, mode: 'responding' })).toBe('writing')
  })

  test('long only while compacting, a subagent works, or a tool runs 10s', async () => {
    expect(groupFor({ ...moment, isCompacting: true })).toBe('long')
    expect(groupFor({ ...moment, hasSubagent: true })).toBe('long')
    expect(groupFor({ ...moment, mode: 'tool-use', toolRunMs: LONG_TOOL_MS - 1 })).toBe('thinking')
    expect(groupFor({ ...moment, mode: 'tool-use', toolRunMs: LONG_TOOL_MS })).toBe('long')
    expect(groupFor({ ...moment, mode: 'requesting', hasMovedOn: false, isCompacting: true })).toBe('long')
  })
})

describe('durationOf', () => {
  test('auto is 1s plus 0.5s per word', async () => {
    expect(durationOf('سُبْحَانَ اللَّهِ', 'auto')).toBe(2000)
    expect(durationOf('اللَّهُ أَكْبَرُ', 'auto')).toBe(2000)
    expect(durationOf(LONG[2] ?? '', 'auto')).toBe(6500)
    expect(wordCount('رَبِّ يَسِّرْ وَلَا تُعَسِّرْ')).toBe(4)
  })

  test('a fixed speed is the same for every phrase', async () => {
    expect(durationOf('سُبْحَانَ اللَّهِ', 5)).toBe(5000)
    expect(durationOf(LONG[2] ?? '', 5)).toBe(5000)
  })
})

describe('starting at random', () => {
  test('startOf is where a phrase begins', async () => {
    expect(startOf('starting', 0, 'auto')).toBe(0)
    expect(phraseAt('starting', startOf('starting', 2, 'auto'), 'auto')).toBe(STARTING[2])
    expect(phraseAt('starting', startOf('starting', 3, 5), 5)).toBe(STARTING[3])
  })

  test('pickStart covers every phrase and never repeats the last', async () => {
    const rolls = [0, 0.3, 0.6, 0.99]
    expect(new Set(rolls.map(r => pickStart(4, undefined, r)))).toEqual(new Set([0, 1, 2, 3]))
    for (let last = 0; last < 4; last++) {
      const picks = rolls.map(r => pickStart(4, last, r))
      expect(picks.includes(last)).toBe(false)
      expect(picks.every(i => i >= 0 && i < 4)).toBe(true)
    }
  })
})

describe('phraseAt', () => {
  test('fixed: plays the list in order, one step per speed', async () => {
    expect(phraseAt('thinking', 0, 3)).toBe(THINKING[0])
    expect(phraseAt('thinking', 2999, 3)).toBe(THINKING[0])
    expect(phraseAt('thinking', 3000, 3)).toBe(THINKING[1])
    expect(phraseAt('thinking', 9000, 3)).toBe(THINKING[3])
  })

  test('auto: longer phrases stay longer', async () => {
    expect(phraseAt('thinking', 1999, 'auto')).toBe(THINKING[0])
    expect(phraseAt('thinking', 2000, 'auto')).toBe(THINKING[1])
    // 2 x 2s, then لا إله إلا الله (4 words) for 3s
    expect(phraseAt('thinking', 4000, 'auto')).toBe(THINKING[2])
    expect(phraseAt('thinking', 6999, 'auto')).toBe(THINKING[2])
    expect(phraseAt('thinking', 7000, 'auto')).toBe(THINKING[3])
  })

  test('wraps around after the last phrase', async () => {
    expect(phraseAt('thinking', THINKING.length * 3000, 3)).toBe(THINKING[0])
    expect(phraseAt('starting', STARTING.length * 2000, 2)).toBe(STARTING[0])
    const cycle = LONG.reduce((sum, p) => sum + durationOf(p, 'auto'), 0)
    expect(phraseAt('long', cycle, 'auto')).toBe(LONG[0])
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

  test('decorative verbs are dropped', async () => {
    expect(withThikr({ word: 'Musing', message: null }, thikr, false)).toEqual({ word: thikr, message: null })
  })

  test('a step stays, the thikr follows', async () => {
    expect(withThikr({ word: 'Editing app.ts', message: null }, thikr, true)).toEqual({ word: `Editing app.ts · ${thikr}`, message: null })
  })

  test('a status message is kept', async () => {
    expect(withThikr({ word: 'Sauteing', message: 'Compacting conversation' }, thikr, false))
      .toEqual({ word: thikr, message: `Compacting conversation · ${thikr}` })
  })
})

describe('isStepRow', () => {
  test('desktop tool modes are steps, Working is not', async () => {
    expect(isStepRow('desktop', { word: 'Editing app.ts', message: null, mode: 'tool-use' }, undefined)).toBe(true)
    expect(isStepRow('desktop', { word: 'Working', message: null, mode: 'tool-use' }, undefined)).toBe(false)
  })

  test('the last step stays a step after the tool ends', async () => {
    for (const mode of ['requesting', 'thinking'] as const) {
      expect(isStepRow('desktop', { word: 'Running a command', message: null, mode }, 'Running a command')).toBe(true)
      expect(isStepRow('desktop', { word: 'Musing', message: null, mode }, 'Running a command')).toBe(false)
    }
  })

  test('any word is a step while a tool runs', async () => {
    expect(isStepRow('desktop', { word: 'Updating docs', message: null, mode: 'thinking' }, undefined, true)).toBe(true)
    expect(isStepRow('desktop', { word: 'Working', message: null, mode: 'thinking' }, undefined, true)).toBe(false)
  })

  test('the terminal has no steps', async () => {
    expect(isStepRow('terminal', { word: 'Sauteing', message: null, mode: 'tool-use' }, 'Sauteing')).toBe(false)
  })
})

describe('readSpeed', () => {
  test('auto by default and for anything out of range', async () => {
    expect(readSpeed(undefined)).toBe('auto')
    expect(readSpeed('auto')).toBe('auto')
    expect(readSpeed('0')).toBe('auto')
    expect(readSpeed('61')).toBe('auto')
    expect(readSpeed('2.5')).toBe('auto')
    expect(readSpeed('fast')).toBe('auto')
  })

  test('whole seconds from 1 to 60', async () => {
    expect(readSpeed('1')).toBe(1)
    expect(readSpeed('5')).toBe(5)
    expect(readSpeed(60)).toBe(60)
  })
})


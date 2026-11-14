import { describe, expect, test } from 'claude-code/testing'

import { istighfarLine, nextCount, slotAt, STAR_FRAMES, STAR_MS, STAR_SLOT, starAt } from '../../src/features/thikr/istighfar.ts'
import { ISTIGHFAR } from '../../src/features/thikr/phrases.ts'
import { dayKey } from '../../src/shared/friday/index.ts'

const at = (y: number, m: number, d: number, h: number, min: number) => new Date(y, m - 1, d, h, min).getTime()

describe('istighfar count', () => {
  test('adds one to the saved count of the same day', () => {
    const now = at(2026, 11, 14, 10, 0)
    expect(nextCount({ day: dayKey(now), count: 4 }, now)).toEqual({ day: dayKey(now), count: 5 })
  })

  test('starts at 1 with nothing saved or something unreadable', () => {
    const now = at(2026, 11, 14, 10, 0)
    for (const saved of [undefined, null, 'x', { day: dayKey(now), count: 'a' }, { day: dayKey(now), count: -3 }]) expect(nextCount(saved, now).count).toBe(1)
  })

  test('resets at 00:00 local time', () => {
    const saved = { day: dayKey(at(2026, 11, 14, 23, 59)), count: 90 }
    expect(nextCount(saved, at(2026, 11, 14, 23, 59)).count).toBe(91)
    expect(nextCount(saved, at(2026, 11, 15, 0, 0))).toEqual({ day: '2026-11-15', count: 1 })
  })

  test('the line is the phrase, a dot, the star and Arabic-Indic digits', () => {
    expect(istighfarLine(7)).toBe(`${ISTIGHFAR} · ✻ ٧`)
    expect(istighfarLine(9, '✢')).toBe(`${ISTIGHFAR} · ✢ ٩`)
    expect(istighfarLine(1204)).toBe(`${ISTIGHFAR} · ✻ ١٢٠٤`)
  })

  test('a showing lasts the given time from the turn start', () => {
    expect(slotAt(1999, 0, 2000)).toBe(0)
    expect(slotAt(2000, 0, 2000)).toBe(1)
    expect(slotAt(-5, 0, 2000)).toBe(0)
  })
})

describe('istighfar star', () => {
  test('cycles back and forth, one frame every STAR_MS from the turn start', () => {
    expect(STAR_FRAMES).toEqual(['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢'])
    expect(STAR_MS).toBe(200)
    expect(STAR_FRAMES.map((_, i) => starAt(1000 + i * STAR_MS, 1000))).toEqual([...STAR_FRAMES])
    expect(starAt(1000 + 10 * STAR_MS, 1000)).toBe('·')
    expect(starAt(1000 + STAR_MS - 1, 1000)).toBe('·')
    expect(starAt(0, 1000)).toBe('·')
  })

  test('every frame is one single-width character, never an emoji', () => {
    for (const frame of STAR_FRAMES) {
      expect([...frame]).toHaveLength(1)
      expect(frame.length).toBe(1)
      expect(frame).not.toMatch(/\p{Emoji_Presentation}/u)
      expect(frame.codePointAt(0)!).toBeLessThan(0x2800)
    }
  })

  test('the slot glyph is one of the frames, so the shaped line can swap it', () => {
    expect(STAR_FRAMES).toContain(STAR_SLOT)
    expect(istighfarLine(3).split(STAR_SLOT)).toHaveLength(2)
  })
})

import { expect, test } from 'claude-code/testing'

import { DEMO_SKIES, demoDuration, demoReply, demoScenes, demoStep } from '../../src/features/athkar/demo.ts'
import { countOf, currentOf, listFor, overall, timesOf } from '../../src/features/athkar/logic.ts'

const FINALE_MS = 3200

for (const style of ['sky', 'frame'] as const) {
  test(`${style}: authored scenes, periods, looks, timing and exact boundaries`, () => {
    const scenes = demoScenes(style, 'yellow', FINALE_MS)
    const isSky = style === 'sky'
    expect(scenes.map(s => s.kind)).toEqual([...Array(isSky ? 6 : 4).fill('reading'), 'finale', 'folded'])
    expect(scenes.map(s => s.id)).toEqual(isSky ? ['75', '83', '84', '97', '77', '98', '98', '98'] : ['75', '83', '84', '98', '98', '98'])
    expect(scenes.map(s => s.duration)).toEqual(isSky ? [5000, 4000, 5000, 4000, 5000, 4000, FINALE_MS, 3000] : [5000, 4000, 5000, 4000, FINALE_MS, 3000])
    expect(scenes.map(s => s.countMs)).toEqual(isSky ? [2500, 400, 2500, 800, 2500, 300, 0, 0] : [2500, 400, 2500, 300, 0, 0])
    expect(scenes.map(s => s.sky)).toEqual(isSky ? [...DEMO_SKIES, 'crescent', 'crescent'] : DEMO_SKIES)
    expect(scenes.map(s => s.period)).toEqual(isSky ? ['morning', 'morning', 'morning', 'evening', 'evening', 'evening', 'evening', 'evening'] : Array(6).fill('morning'))
    expect(scenes.map(s => s.accent)).toEqual(isSky ? Array(8).fill('yellow') : ['orange', 'green', 'yellow', 'blue', 'orange', 'green'])
    expect(demoDuration(style, FINALE_MS)).toBe(isSky ? 33_200 : 24_200)
    expect(demoReply(style, FINALE_MS)).toBe(`**Athkar demo:** ${style} · ${isSky ? '8 scenes · 33.2s' : '6 scenes · 24.2s'}`)
    let elapsed = 0
    for (const scene of scenes) {
      expect(scene.startsAt).toBe(elapsed)
      elapsed += scene.duration
      expect(demoStep(style, 'yellow', scene.startsAt, FINALE_MS)).toMatchObject(scene)
      expect(demoStep(style, 'yellow', scene.startsAt + scene.duration - 1, FINALE_MS)).toMatchObject(scene)
      const step = demoStep(style, 'yellow', scene.startsAt, FINALE_MS)!
      const list = listFor(step.period)
      expect(currentOf(step.period, step.reading).id).toBe(scene.id)
      expect(step.reading.index).toBe(list.findIndex(t => t.id === scene.id))
      for (const thikr of list.slice(0, step.reading.index)) expect(countOf(thikr, step.reading)).toBe(timesOf(thikr))
    }
    expect(elapsed).toBe(demoDuration(style, FINALE_MS))
    expect(demoStep(style, 'yellow', -1, FINALE_MS)).toBeUndefined()
    expect(demoStep(style, 'yellow', elapsed, FINALE_MS)).toBeUndefined()
  })

  test(`${style}: every reading counts and moves the glow; id 98 reaches ten`, () => {
    const lists = [listFor('morning'), listFor('evening')]
    const before = JSON.stringify(lists)
    const scenes = demoScenes(style, 'orange', FINALE_MS)
    for (const scene of scenes.filter(s => s.kind === 'reading')) {
      const first = demoStep(style, 'orange', scene.startsAt, FINALE_MS)!
      const next = demoStep(style, 'orange', scene.startsAt + scene.countMs, FINALE_MS)!
      const thikr = currentOf(first.period, first.reading)
      expect(countOf(thikr, first.reading)).toBe(0)
      expect(countOf(thikr, next.reading)).toBe(1)
      expect(next.progress).toBeGreaterThan(first.progress)
      expect(next.from).toBe(first.progress)
      expect(next.glowMs).toBe(0)
      expect(demoStep(style, 'orange', scene.startsAt + scene.countMs + 100, FINALE_MS)!.glowMs).toBe(100)
      expect(next.reading.isDone).toBe(false)
      const end = demoStep(style, 'orange', scene.startsAt + scene.duration - 1, FINALE_MS)!
      expect(countOf(thikr, end.reading)).toBe(timesOf(thikr))
    }
    const last = scenes.find(s => s.kind === 'reading' && s.id === '98')!
    for (let count = 0; count <= 10; count++) {
      const step = demoStep(style, 'orange', last.startsAt + count * last.countMs, FINALE_MS)!
      expect(countOf(currentOf(step.period, step.reading), step.reading)).toBe(count)
    }
    const finished = demoStep(style, 'orange', last.startsAt + 3000, FINALE_MS)!
    expect(finished.progress).toBe(1)
    expect(overall(finished.period, finished.reading)).toBe(1)
    expect(finished.reading.isDone).toBe(false)
    expect(JSON.stringify(lists)).toBe(before)
  })

  test(`${style}: full real finale followed by folded done`, () => {
    const scenes = demoScenes(style, 'blue', FINALE_MS)
    const finale = demoStep(style, 'blue', scenes.find(s => s.kind === 'finale')!.startsAt + 700, FINALE_MS)!
    expect(finale).toMatchObject({ finaleMs: 700, isActive: true, progress: 1, reading: { isDone: true } })
    const folded = demoStep(style, 'blue', scenes.find(s => s.kind === 'folded')!.startsAt, FINALE_MS)!
    expect(folded.finaleMs).toBeUndefined()
    expect(folded).toMatchObject({ isActive: false, progress: 1, reading: { isDone: true } })
    if (style === 'sky') {
      expect(finale).toMatchObject({ sky: 'crescent', period: 'evening' })
      expect(folded).toMatchObject({ sky: 'crescent', period: 'evening' })
    }
    expect(demoScenes(style, 'orange', 4200).find(s => s.kind === 'finale')!.duration).toBe(4200)
    expect(demoDuration(style, 4200)).toBe(style === 'sky' ? 34_200 : 25_200)
  })
}

test('sky shows each sky on a distinct reading, including an evening-only short thikr', () => {
  const scenes = demoScenes('sky', 'orange', FINALE_MS).filter(s => s.kind === 'reading')
  expect(scenes.map(s => s.sky)).toEqual(DEMO_SKIES)
  expect(new Set(scenes.map(s => s.id)).size).toBe(6)
  const short = listFor('evening').find(t => t.id === scenes[3]!.id)!
  expect(short.periods).toBe('evening')
  expect(short.times).toBe(3)
  const long = listFor('evening').find(t => t.id === scenes[4]!.id)!
  expect(long.evening).toBeDefined()
  expect(long.evening).not.toBe(long.text)
})

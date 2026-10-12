import { expect, test } from 'claude-code/testing'

import { demoDuration, demoReply, demoScenes, demoStep } from '../../src/features/athkar/demo.ts'
import { countOf, currentOf, listFor, overall } from '../../src/features/athkar/logic.ts'

const FINALE_MS = 3200

for (const style of ['sky', 'frame'] as const) {
  test(`${style}: the six scenes tell the story with authored readings and exact boundaries`, () => {
    const scenes = demoScenes(style, 'gold', FINALE_MS)
    expect(scenes.map(s => s.kind)).toEqual(['reading', 'reading', 'reading', 'reading', 'finale', 'folded'])
    expect(scenes.map(s => s.id)).toEqual(['75', '83', '84', '98', '98', '98'])
    expect(scenes.map(s => s.duration)).toEqual([5000, 4000, 5000, 4000, FINALE_MS, 3000])
    expect(scenes.map(s => s.sky)).toEqual(['dawn', 'sunrise', 'day', 'rose', 'bluehour', 'crescent'])
    // Sky shows the morning set under the morning skies and the evening set under the evening ones.
    expect(scenes.map(s => s.period)).toEqual(style === 'sky' ? ['morning', 'morning', 'morning', 'evening', 'evening', 'evening'] : Array(6).fill('morning'))
    expect(scenes.map(s => s.accent)).toEqual(style === 'sky' ? Array(6).fill('gold') : ['orange', 'green', 'gold', 'blue', 'orange', 'green'])
    expect(demoDuration(FINALE_MS)).toBe(24_200)
    expect(demoReply(style, FINALE_MS)).toBe(`**Athkar demo:** ${style} · 6 scenes · 24.2s`)
    for (const scene of scenes) {
      expect(demoStep(style, 'gold', scene.startsAt, FINALE_MS)).toMatchObject(scene)
      expect(demoStep(style, 'gold', scene.startsAt + scene.duration - 1, FINALE_MS)).toMatchObject(scene)
      const step = demoStep(style, 'gold', scene.startsAt, FINALE_MS)!
      expect(currentOf(step.period, step.reading).id).toBe(scene.id)
      expect(step.reading.index).toBe(listFor(step.period).findIndex(t => t.id === scene.id))
    }
    expect(demoStep(style, 'gold', -1, FINALE_MS)).toBeUndefined()
    expect(demoStep(style, 'gold', demoDuration(FINALE_MS), FINALE_MS)).toBeUndefined()
  })
}

test('every reading scene counts, and id 98 reaches its authored ten repetitions before the finale', () => {
  const list = listFor('morning')
  const before = JSON.stringify(list)
  const scenes = demoScenes('sky', 'orange', FINALE_MS)
  for (const scene of scenes.slice(0, 4)) {
    const first = demoStep('sky', 'orange', scene.startsAt, FINALE_MS)!
    const next = demoStep('sky', 'orange', scene.startsAt + scene.countMs, FINALE_MS)!
    const thikr = currentOf(first.period, first.reading)
    expect(countOf(thikr, first.reading)).toBe(0)
    expect(countOf(thikr, next.reading)).toBe(1)
    expect(next.progress).toBeGreaterThan(first.progress)
    expect(next.from).toBe(first.progress)
    expect(next.reading.isDone).toBe(false)
  }
  const last = scenes[3]!
  for (let count = 0; count <= 10; count++) {
    const step = demoStep('frame', 'orange', last.startsAt + count * last.countMs, FINALE_MS)!
    expect(countOf(currentOf(step.period, step.reading), step.reading)).toBe(count)
  }
  const finished = demoStep('sky', 'orange', last.startsAt + 3000, FINALE_MS)!
  expect(finished.progress).toBe(1)
  expect(overall(finished.period, finished.reading)).toBe(1)
  expect(finished.reading.isDone).toBe(false)
  expect(JSON.stringify(list)).toBe(before)
})

test('the finale keeps its real clock and the finished final scene is folded', () => {
  const scenes = demoScenes('frame', 'blue', FINALE_MS)
  const finale = demoStep('frame', 'blue', scenes[4]!.startsAt + 700, FINALE_MS)!
  expect(finale.finaleMs).toBe(700)
  expect(finale.isActive).toBe(true)
  expect(finale.reading.isDone).toBe(true)
  expect(finale.progress).toBe(1)
  const folded = demoStep('frame', 'blue', scenes[5]!.startsAt, FINALE_MS)!
  expect(folded.finaleMs).toBeUndefined()
  expect(folded.isActive).toBe(false)
  expect(folded.reading.isDone).toBe(true)
  expect(folded.progress).toBe(1)
  // The story takes the real finale duration supplied by the runner.
  expect(demoScenes('sky', 'orange', 4200)[4]?.duration).toBe(4200)
  expect(demoDuration(4200)).toBe(25_200)
})

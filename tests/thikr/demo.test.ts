import { expect, test } from 'claude-code/testing'

import { demoDuration, demoPrompt, demoReply, demoSceneAt, demoScenes, DEMO_DONE, DEMO_LIMIT_MS, DEMO_STEPS, DEMO_STEP_MS } from '../../src/features/thikr/demo.ts'
import { LONG, SALAWAT, STARTING, THINKING, WRITING } from '../../src/features/thikr/phrases.ts'

test('every moment in order: starting, thinking, writing, long, then one salawat', () => {
  const scenes = demoScenes()

  expect(scenes.map(s => s.text)).toEqual([...STARTING, ...THINKING, ...WRITING, ...LONG, SALAWAT[0]])
  expect(scenes.map(s => s.group)).toEqual([
    ...STARTING.map(() => 'starting'), ...THINKING.map(() => 'thinking'), ...WRITING.map(() => 'writing'), ...LONG.map(() => 'long'), 'salawat',
  ])
})

test('each phrase stays 1.5 s, with exact boundaries; the last holds', () => {
  const scenes = demoScenes()
  expect(DEMO_STEP_MS).toBe(1500)
  expect(DEMO_LIMIT_MS).toBe(3000)
  expect(demoDuration()).toBe(scenes.length * 1500)
  for (const [i, scene] of scenes.entries()) {
    expect(scene.startsAt).toBe(i * 1500)
    expect(demoSceneAt(scene.startsAt)).toEqual(scene)
    expect(demoSceneAt(scene.startsAt + 1499)).toEqual(scene)
  }
  const last = scenes[scenes.length - 1]!
  expect(demoSceneAt(demoDuration())).toEqual(last)
  expect(demoSceneAt(10 * demoDuration())).toEqual(last)
  expect(demoSceneAt(-5)).toEqual(scenes[0])
})

test('the reply says the demo is playing', () => {
  expect(demoReply()).toBe('**Thikr demo:** playing. Claude runs a few short steps (about 30 s).')
})

test('the steps are the three timed Bash sleeps, long enough for every phrase', () => {
  expect(DEMO_STEPS).toEqual([
    { command: 'sleep 6; echo start', description: 'Thikr demo: a short step' },
    { command: 'sleep 14; echo long', description: 'Thikr demo: a long step' },
    { command: 'sleep 9; echo end', description: 'Thikr demo: a last step' },
  ])
  const sleeps = DEMO_STEPS.map(step => Number(/^sleep (\d+);/.exec(step.command)?.[1]))
  expect(sleeps.some(seconds => seconds > 10)).toBe(true)
  expect(sleeps.reduce((sum, seconds) => sum + seconds, 0) * 1000).toBeGreaterThanOrEqual(demoDuration())
})

test('the prompt says it is the demo, lists each step in order, and asks for one short line', () => {
  const prompt = demoPrompt()
  const at = DEMO_STEPS.map(step => prompt.indexOf(`command: ${step.command} | description: ${step.description}`))

  expect(prompt).toContain('This is the muslim mod\'s thikr demo')
  expect(prompt).toContain('Do nothing else')
  expect(at.every(i => i >= 0)).toBe(true)
  expect([...at].sort((a, b) => a - b)).toEqual(at)
  expect(prompt).toContain(`exactly one short line: ${DEMO_DONE}`)
})

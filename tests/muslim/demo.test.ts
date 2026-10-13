import { expect, test } from 'claude-code/testing'

import { DEMO_STEPS, DEMO_GAP_MS, DEMO_START_MS, demoReply, demoTiming } from '../../src/demo.ts'

test('the shared demo signals the existing demos in order, with no athkar style argument', () => {
  expect(DEMO_STEPS).toEqual(['thikr', 'athkar', 'salah'])
})

test('signals start later; thikr says when its hold ends; each following demo has a gap', () => {
  expect(DEMO_START_MS).toBe(100)
  expect(DEMO_GAP_MS).toBe(100)
  expect(demoTiming('desktop', 'sky').afterThikrMs).toBe(DEMO_GAP_MS)
})

test('sky lasts 33.2 seconds, frame 24.2 seconds, and salah 8 seconds', () => {
  expect(demoTiming('desktop', 'sky')).toEqual({ afterThikrMs: 100, athkarMs: 33_200, salahMs: 8000 })
  expect(demoTiming('desktop', 'frame')).toEqual({ afterThikrMs: 100, athkarMs: 24_200, salahMs: 8000 })
  expect(demoTiming('terminal', 'sky')).toEqual(demoTiming('terminal', 'frame'))
  expect(demoTiming('terminal', 'sky')).toEqual({ afterThikrMs: 100, athkarMs: 24_200, salahMs: 6010 })
})

test('the reply names every demo and explains the transcript and token cost', () => {
  expect(demoReply()).toBe('**Muslim demo:** playing. Thikr (a real turn, about 30 s), then athkar, then /salah demo (the athan moment). The thikr part uses tokens and leaves a message in the transcript.')
})

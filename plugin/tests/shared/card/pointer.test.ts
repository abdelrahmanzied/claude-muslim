import { expect, test } from 'claude-code/testing'
import { pointerPixels, pointerSlack, rowPixels, ROW_PX } from '../../../src/shared/card/pointer.ts'

test('cells scale to pixels over the width and height', () => {
  expect(pointerPixels(400, 10, 5, 40, 20, 200)).toEqual({ x: 100, y: 50 })
})

// Pane heights and row counts Desktop reported in one session: rows are about 19.25px, rounded up.
test('a row is 19.25px where the reported rows allow it, else height over rows', () => {
  for (const [height, rows] of [[1368, 72], [1314, 69], [1420, 74], [1498, 78]] as const) expect(rowPixels(rows, height)).toBe(ROW_PX)
  expect(pointerPixels(512, 11.5, 62.5, 61, 72, 1368).y).toBe(1203.125)
  expect(rowPixels(20, 200)).toBe(10)
  expect(rowPixels(10, 400)).toBe(40)
})

test('slack is half a cell for a coarse pointer and nothing for an exact or bad one', () => {
  expect(pointerSlack(400, 40, 20, 200, true)).toEqual({ x: 5, y: 5 })
  expect(pointerSlack(400, 40, 20, 200, false)).toEqual({ x: 0, y: 0 })
  expect(pointerSlack(400, 0, 20, 200, true)).toEqual({ x: 0, y: 0 })
})

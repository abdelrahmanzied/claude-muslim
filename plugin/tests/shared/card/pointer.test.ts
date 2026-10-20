import { expect, test } from 'claude-code/testing'
import { pointerPixels, pointerSlack } from '../../../src/shared/card/pointer.ts'

test('cells scale to pixels over the width and height', () => {
  expect(pointerPixels(400, 10, 5, 40, 20, 200)).toEqual({ x: 100, y: 50 })
})

test('slack is half a cell for a coarse pointer and nothing for an exact or bad one', () => {
  expect(pointerSlack(400, 40, 20, 200, true)).toEqual({ x: 5, y: 5 })
  expect(pointerSlack(400, 40, 20, 200, false)).toEqual({ x: 0, y: 0 })
  expect(pointerSlack(400, 0, 20, 200, true)).toEqual({ x: 0, y: 0 })
})

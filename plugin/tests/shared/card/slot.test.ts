import { expect, test } from 'claude-code/testing'

import { isAnotherCardShown, markCard, resetCards } from '../../../src/shared/card/slot.ts'

test('a card sees the others but never itself', () => {
  resetCards()
  expect(isAnotherCardShown('friday')).toBe(false)
  markCard('athkar', true)
  expect(isAnotherCardShown('friday')).toBe(true)
  expect(isAnotherCardShown('athkar')).toBe(false)
  markCard('athkar', false)
  expect(isAnotherCardShown('friday')).toBe(false)
})

test('reset clears every mark', () => {
  markCard('athan', true)
  markCard('athkar', true)
  resetCards()
  expect(isAnotherCardShown('friday')).toBe(false)
})

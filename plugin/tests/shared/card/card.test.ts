import { expect, test } from 'claude-code/testing'

import { cardHeight, cardSvg, closeArea, frameOf, isCardMessage, isOnClose, type CardFrame } from '../../../src/shared/card/card.ts'

const frame = (over: Partial<CardFrame> = {}): CardFrame => ({ width: 840, height: cardHeight(), isFolded: false, card: { ch: 8.4, lh: 20 }, ...over })

test('every card stands at one open height: two lines of the text size and the room around them', () => {
  expect(cardHeight()).toBe(77)
  expect(cardHeight(20)).toBeGreaterThan(cardHeight())
})

test('over the desktop card the picture reaches a cell past each side and half a line above and below', () => {
  const box = frameOf(frame())
  expect(box.width).toBe(Math.round(840 + 2 * 8.4))
  expect(box.height).toBe(cardHeight() + 20)
  expect(frameOf(frame({ drawWidth: 900 })).width).toBe(900)
})

test('the × is the top left; folded, the whole row height', () => {
  expect(closeArea(frame())).toEqual({ x0: 0, x1: 34, y0: 0, y1: 30 })
  expect(closeArea(frame({ isFolded: true, height: 24 })).y1).toBe(24)
  expect(isOnClose(frame(), 2, 1, 100, 5)).toBe(true)
  expect(isOnClose(frame(), 40, 1, 100, 5)).toBe(false)
})

test('the card holds what a feature gives it, with the × first and its own rules before the feature’s', () => {
  const svg = cardSvg(frame(), { classes: 'mine active', style: '--k:1', html: '<p>inside</p>', css: '.mine {color: red;}', hoverClose: true })
  expect(svg).toContain('<div class="band mine active" data-band="" style="--k:1;--ax:8px;--ay:10px;border-radius:10px"><span class="x xabs hot">×</span><p>inside</p></div>')
  expect(svg.indexOf('.xabs {')).toBeLessThan(svg.indexOf('.mine {'))
})

test('only the card’s own messages are read', () => {
  expect(isCardMessage({ act: 'pointer', x: 1, y: 2, button: 'left' })).toBe(true)
  expect(isCardMessage({ act: 'size', columns: 1, rows: 1 })).toBe(true)
  expect(isCardMessage({ act: 'hide' })).toBe(true)
  expect(isCardMessage({ act: 'pointer' })).toBe(false)
  expect(isCardMessage('hide')).toBe(false)
})

import type { UiScrollInput } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import { skipPaneScroll } from '../../src/features/muslim-pane/scroll.ts'

const event: UiScrollInput = { component: 'Pane', requestId: 'muslim', by: 1, offset: 0, bodyRows: 40, contentRows: 40, origin: { kind: 'person' } }

test('fitting content and clamped edge requests stay undrawn regardless of wheel direction or pointer', () => {
  for (const by of [-10, -1, -0.2, 0, 0.2, 1, 10]) {
    for (const pointer of [undefined, { column: 25, row: 23 }, { column: 25, row: 25 }]) {
      expect(skipPaneScroll(true, 0, { ...event, by, pointer })).toBe(true)
      expect(skipPaneScroll(true, 0, { ...event, by, pointer, contentRows: 30 })).toBe(true)
    }
  }
})

test('overflow moves in both directions; a request at either limit does not redraw', () => {
  const overflow = { ...event, bodyRows: 20 }
  expect(skipPaneScroll(true, 0, { ...overflow, offset: 3 })).toBe(false)
  expect(skipPaneScroll(true, 3, { ...overflow, offset: 3, by: 0 })).toBe(true)
  expect(skipPaneScroll(true, 20, { ...overflow, offset: 20, by: 5 })).toBe(true)
  expect(skipPaneScroll(true, 20, { ...overflow, offset: 17, by: -3 })).toBe(false)
  expect(skipPaneScroll(true, 0, { ...overflow, offset: 0, by: -5 })).toBe(true)
})

test('folding or resizing that puts the old offset past the end still lets the host reset it', () => {
  expect(skipPaneScroll(true, 20, { ...event, contentRows: 10 })).toBe(false)
  expect(skipPaneScroll(true, 0, event)).toBe(true)
})

test('other surfaces and plugin scrolls remain the host\'s', () => {
  expect(skipPaneScroll(false, 0, event)).toBe(false)
  expect(skipPaneScroll(true, 0, { ...event, origin: { kind: 'plugin', name: 'muslim' } })).toBe(false)
})

test('invalid measurements are left to the engine instead of swallowed', () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    expect(skipPaneScroll(true, value, event)).toBe(false)
    for (const key of ['offset', 'bodyRows', 'contentRows'] as const) expect(skipPaneScroll(true, 0, { ...event, [key]: value })).toBe(false)
  }
  expect(skipPaneScroll(true, -1, event)).toBe(false)
  expect(skipPaneScroll(true, 0, { ...event, bodyRows: -1 })).toBe(false)
  expect(skipPaneScroll(true, 0, { ...event, contentRows: -1 })).toBe(false)
})

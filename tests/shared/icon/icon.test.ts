import { expect, test } from 'claude-code/testing'
import { FEATURE_ICONS } from '../../../src/shared/icon/index.ts'

test('the standard feature icon set has exactly the six approved keys', () => {
  expect(Object.keys(FEATURE_ICONS).sort()).toEqual([
    'gearteeth', 'horizon', 'qpane', 'sliders', 'spinbeads', 'sujoodreal',
  ])
})

test('each standard feature icon is a non-empty SVG fragment', () => {
  for (const fragment of Object.values(FEATURE_ICONS)) {
    expect(fragment.trim().length).toBeGreaterThan(0)
    expect(fragment).toMatch(/^<(path|circle)\b/)
    expect(fragment).not.toContain('<svg')
  }
})

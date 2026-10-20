import { expect, test } from 'claude-code/testing'
import { readOptions } from '../../src/config.ts'
import { panelSalah } from '../../src/features/salah/panel.ts'

const options = (extra: Record<string, unknown> = {}) => readOptions({ salahPlace: 'Munich; 48.1351, 11.582; Europe/Berlin; DE', ...extra })
const NOON = Date.UTC(2026, 5, 15, 10, 0)

test('no place gives nothing', () => {
  expect(panelSalah(readOptions({}), NOON)).toBeNull()
})

test('today lists the five prays in order with the next one among them', () => {
  const result = panelSalah(options(), NOON)!
  expect(result.city).toBe('Munich')
  expect(result.prays.map(p => p.pray)).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'])
  expect(result.prays.map(p => p.at)).toEqual([...result.prays.map(p => p.at)].sort((a, b) => a - b))
  expect(result.next.at).toBeGreaterThan(NOON)
  expect(result.prays.some(p => p.at === result.next.at)).toBe(true)
  expect(result.prays[0]!.clock).toMatch(/^\d\d:\d\d$/)
})

test('after Isha the next is the following Fajr, not a row of today', () => {
  const late = Date.UTC(2026, 11, 15, 21, 0)
  const result = panelSalah(options(), late)!
  expect(result.next.pray).toBe('fajr')
  expect(result.prays.some(p => p.at === result.next.at)).toBe(false)
})

test('the athan setting rides along', () => {
  expect(panelSalah(options({ salahAthan: false }), NOON)!.isAthan).toBe(false)
  expect(panelSalah(options(), NOON)!.isAthan).toBe(true)
})

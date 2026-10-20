import { expect, test } from 'claude-code/testing'
import { demoMoment, demoState, DEMO_OPEN_MS, DEMO_FOLDED_MS } from '../../src/features/salah/demo.ts'
import { clockText } from '../../src/features/salah/times.ts'
import { TOTAL_MS } from '../../src/features/salah/minaret.ts'

const NOW = Date.parse('2026-10-10T10:00:00Z')

test('the demo always shows Fajr at 05:00 without a city or calculation', () => {
  expect(demoMoment()).toEqual({ pray: 'fajr', time: clockText(Date.UTC(2000, 0, 1, 5), 'UTC'), text: `**Salah demo:** athan · Fajr ${clockText(Date.UTC(2000, 0, 1, 5), 'UTC')} · athkar after salah` })
  expect(demoMoment().time).toBe('05:00')
})

test('desktop is open five seconds then folded three; terminal rises then folds three', () => {
  const moment = demoState(NOW)
  expect(moment.card).toEqual({ pray: 'fajr', time: '05:00', isFolded: false, foldsAt: NOW + DEMO_OPEN_MS, until: NOW + DEMO_OPEN_MS + DEMO_FOLDED_MS })
  expect(moment.minaret).toEqual({ pray: 'fajr', frame: 1, startedAt: NOW, isFolded: false, foldsAt: NOW + TOTAL_MS, until: NOW + TOTAL_MS + DEMO_FOLDED_MS })
})

test('each demo constructs a disposable moment', () => {
  const first = demoState(NOW)
  first.card.isFolded = true
  expect(demoState(NOW).card.isFolded).toBe(false)
})

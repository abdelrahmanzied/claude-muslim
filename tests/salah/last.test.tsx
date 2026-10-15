import type { SalahLast } from '../../types'
import { expect, mock, test } from 'claude-code/testing'
import { lastSalahToday, NO_ADJUST, timesOn } from '../../src/features/salah/times.ts'

const PLACE = { latitude: 48.1372, longitude: 11.5755, timeZone: 'Europe/Berlin' }
const NOW = Date.parse('2026-10-10T10:00:00Z')
const MUNICH = { salahPlace: 'Munich, Germany; 48.1372, 11.5755; Europe/Berlin; DE', salahAthan: false }
const band = { plugin: 'muslim', surface: 'terminal' as const, component: 'AbovePrompt' as const, requestId: 'last', props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} } }

test('today\'s last salah excludes sunrise and yesterday, includes exact prayer instants and adjustments', () => {
  const times = timesOn(PLACE, 'mwl', NO_ADJUST, NOW)
  expect(lastSalahToday(PLACE, 'mwl', NO_ADJUST, times.fajr - 1)).toBe(null)
  expect(lastSalahToday(PLACE, 'mwl', NO_ADJUST, times.sunrise)).toEqual({ pray: 'fajr', at: times.fajr })
  for (const pray of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
    expect(lastSalahToday(PLACE, 'mwl', NO_ADJUST, times[pray])).toEqual({ pray, at: times[pray] })
  }
  expect(lastSalahToday(PLACE, 'mwl', { ...NO_ADJUST, dhuhr: 5 }, times.dhuhr + 60_000)?.pray).toBe('fajr')
  expect(lastSalahToday(PLACE, 'mwl', NO_ADJUST, Date.parse('2026-10-10T22:01:00Z'))).toBe(null)
})

test('the real salah ticker publishes salahLast even with athan off and advances to the next prayer', { options: MUNICH }, async ($, on) => {
  const times = timesOn(PLACE, 'mwl', NO_ADJUST, NOW)
  const clock = mock.clock(on, { now: times.dhuhr - 1000 })
  mock.store(on)
  mock.env(on, {})
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
  let published: SalahLast | null | undefined
  on('state.set', { plugin: 'muslim', key: 'salahLast' }, async (_$, e, next) => { published = e.value as SalahLast | null; return next(e) })
  const ui = await $.ui.mount(band)
  await clock.advance(0)
  expect(published).toEqual({ pray: 'fajr', at: times.fajr })
  await clock.advance(2000)
  expect(published).toEqual({ pray: 'dhuhr', at: times.dhuhr })
  await ui.unmount()
})

for (const options of [{}, { ...MUNICH, salahShow: 'off' }]) {
  test('no place or salah off clears an old published prayer', { options }, async ($, on) => {
    const clock = mock.clock(on, { now: NOW })
    mock.store(on)
    mock.env(on, {})
    on('ui.render', { component: 'AbovePrompt' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
    let seeded = true
    let published: unknown
    on('state.get', { plugin: 'muslim', key: 'salahLast' }, async (_$, e, next) => {
      const actual = await next(e)
      return seeded ? { value: { value: { pray: 'fajr', at: NOW - 1000 }, version: actual.value?.version ?? 0 } } : actual
    })
    on('state.set', { plugin: 'muslim', key: 'salahLast' }, async (_$, e, next) => { seeded = false; published = e.value; return next(e) })
    const ui = await $.ui.mount(band)
    await clock.advance(0)
    expect(published).toBe(null)
    await ui.unmount()
  })
}

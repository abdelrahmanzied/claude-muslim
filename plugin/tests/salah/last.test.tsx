import type { SalahLast } from '../../types'
import { expect, mock, test } from 'claude-code/testing'
import { lastSalahToday, NO_ADJUST, timesOn } from '../../src/features/salah/times.ts'
import { ATHKAR_QUIET } from '../fixtures/config.ts'

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

test('no place clears an old published prayer', async ($, on) => {
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

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: show off tracks prayers every 30 seconds without a line, window or athan`, { options: { ...MUNICH, ...ATHKAR_QUIET, salahShow: 'off', salahAthan: true } }, async ($, on) => {
    const times = timesOn(PLACE, 'mwl', NO_ADJUST, NOW)
    const clock = mock.clock(on, { now: times.dhuhr - 1000 })
    mock.store(on)
    mock.env(on, {})
    on('ui.render', { component: 'AbovePrompt' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
    on('ui.render', { component: 'SessionMode' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
    // A reload may leave a line and countdown signal; the first tick clears both.
    const seed: Record<string, unknown> = {
      salahLine: 'old prayer line',
      salahWindow: { pray: 'dhuhr', at: times.dhuhr },
    }
    const published: Record<string, unknown> = {}
    const athanWrites: string[] = []
    on('state.get', async (_$, e, next) => {
      const actual = await next(e)
      return e.key in seed ? { value: { value: seed[e.key], version: actual.value?.version ?? 0 } } : actual
    })
    on('state.set', async (_$, e, next) => {
      delete seed[e.key]
      published[e.key] = e.value
      if (['salahCard', 'salahMinaret', 'salahAthanShown'].includes(e.key)) athanWrites.push(e.key)
      return next(e)
    })
    const footer = { plugin: 'muslim', surface, component: 'SessionMode' as const, requestId: 'last-footer', props: { modes: [] as readonly string[] } }
    // Exercise both ticker entry points: terminal band first, desktop footer first.
    const first = await $.ui.mount(surface === 'terminal' ? { ...band, surface } : footer)
    await clock.advance(0)
    const second = await $.ui.mount(surface === 'terminal' ? footer : { ...band, surface })
    expect(published.salahLast).toEqual({ pray: 'fajr', at: times.fajr })
    expect(published.salahLine).toBe(null)
    expect(published.salahWindow).toBe(null)
    await clock.advance(29_999)
    expect(published.salahLast).toEqual({ pray: 'fajr', at: times.fajr })
    await clock.advance(1)
    expect(published.salahLast).toEqual({ pray: 'dhuhr', at: times.dhuhr })
    expect(athanWrites).toEqual([])
    for (const ui of [first, second]) {
      expect(await ui.find({ key: 'salah-line' })).toBeUndefined()
      expect(await ui.find({ key: 'salah-athan-row' })).toBeUndefined()
      expect(await ui.find({ key: 'salah-minaret-0' })).toBeUndefined()
      expect(await ui.find({ key: 'salah-athan' })).toBeUndefined()
    }
    await first.unmount()
    await second.unmount()
  })
}

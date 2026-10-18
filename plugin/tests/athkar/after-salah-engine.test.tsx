import { IN_MS } from '../../src/shared/pray/line.ts'
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Day, SalahLast } from '../../types'
import { dayOf, emptyDay, listFor, TITLE } from '../../src/features/athkar/logic.ts'
import { timesOn, NO_ADJUST } from '../../src/features/salah/times.ts'
import { resetHint } from '../../src/features/athkar/look.ts'
import { stripTashkeel } from '../../src/shared/arabic/visual.ts'

const NOW = new Date(2026, 9, 10, 13, 10).getTime()
const MUNICH = { salahPlace: 'Munich, Germany; 48.1372, 11.5755; Europe/Berlin; DE', salahAthan: false }
const run = (args: string) => ({ command: 'athkar', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })
const band = (surface: 'desktop' | 'terminal') => ({
  plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId: 'after-salah-band',
  props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} },
})
const engine = (on: On, surface: 'desktop' | 'terminal') => {
  mock.env(on, {})
  on('session.surface', async () => ({ value: surface }))
  on('config.list', async () => ({ value: [] }))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
}

// Keep a mutable fixture while retaining the host's versions and subscriptions.
const savedDay = (on: On, initial = emptyDay(dayOf(new Date(NOW)))) => {
  const kept = { day: initial as Day }
  on('state.get', { plugin: 'muslim', key: 'athkar' }, async (_$, e, next) => {
    const actual = await next(e)
    return { value: { value: kept.day, version: actual.value?.version ?? 0 } }
  })
  on('state.set', { plugin: 'muslim', key: 'athkar' }, async (_$, e, next) => {
    const result = await next(e)
    if (result.value?.isSet) kept.day = e.value as Day
    return result
  })
  return kept
}

for (const surface of ['desktop', 'terminal'] as const) {
  test(`${surface}: manual general reader opens, unhides, counts, replies with done hint and resets`, async ($, on) => {
    mock.clock(on, { now: NOW })
    const day = emptyDay(dayOf(new Date(NOW)))
    day.afterSalah.isHidden = true
    mock.store(on, { athkar: day })
    const kept = savedDay(on, day)
    engine(on, surface)
    const reply = await $.command.run(run('after-salah'))
    expect(reply.text).toBe('Athkar after salah open above the prompt')
    const ui = await $.ui.mount(band(surface))
    if (surface === 'desktop') expect(String((await ui.find({ in: 'athkar', type: 'Svg' }))?.props.source)).toContain(TITLE.afterSalah)
    else expect(await ui.find({ in: 'athkar', text: stripTashkeel(TITLE.afterSalah) })).toBeDefined()
    await ui.post({ act: 'key', key: 'return' }) // Cover to reading; command already woke it.
    await ui.post({ act: 'key', key: 'space' })
    const saved = kept.day
    expect(saved.afterSalah.counts['66-istighfar']).toBe(1)
    expect(saved.afterSalah.pray).toBe(null)
    // Finish using the shared path on its last item, with the whole set counted.
    const list = listFor('afterSalah')
    kept.day = { ...saved, afterSalah: { ...saved.afterSalah, index: list.length - 1, counts: Object.fromEntries(list.map(t => [t.id, t.times])) } }
    await ui.post({ act: 'key', key: 'left' })
    expect((await $.command.run(run('after-salah'))).text).toContain(resetHint('afterSalah'))
    expect((await $.command.run(run('after-salah reset'))).text).toBe('Athkar after salah start again from the first')
    expect(kept.day.afterSalah).toEqual(emptyDay(day.day).afterSalah)
    expect((await $.command.run(run(''))).text).toContain('| Athkar after salah |')
    expect((await $.command.run(run('help'))).text).toContain('offered by itself after the athan card')
    await ui.unmount()
  })

  test(`${surface}: automatic offer hides back to morning, new prayer resets the slot, done falls back, manual still opens`, { options: MUNICH, timeoutMs: 60000 }, async ($, on) => {
    const clock = mock.clock(on, { now: NOW })
    mock.store(on)
    engine(on, surface)
    const kept = savedDay(on)
    let last: SalahLast = { pray: 'fajr', at: NOW - IN_MS }
    on('state.get', { plugin: 'muslim', key: 'salahLast' }, async (_$, e, next) => {
      const actual = await next(e)
      return { value: { value: last, version: actual.value?.version ?? 0 } }
    })
    const ui = await $.ui.mount(band(surface))
    const title = async (set: 'morning' | 'afterSalah') => surface === 'desktop'
      ? String((await ui.find({ in: 'athkar', type: 'Svg' }))?.props.source).includes(TITLE[set])
      : (await ui.find({ in: 'athkar', text: stripTashkeel(TITLE[set]) })) !== undefined
    expect({ stage: 1, visible: await title('afterSalah') }).toEqual({ stage: 1, visible: true })
    await clock.advance(0)
    await ui.post({ act: 'hide' })
    expect({ stage: 2, visible: await title('morning') }).toEqual({ stage: 2, visible: true })
    last = { pray: 'dhuhr', at: NOW + 60_000 }
    await clock.advance(60_000)
    expect(await title('morning')).toBe(true)
    await clock.advance(IN_MS)
    expect({ stage: 3, visible: await title('afterSalah') }).toEqual({ stage: 3, visible: true })
    await clock.advance(0)
    let saved = kept.day
    expect(saved.afterSalah).toEqual({ ...emptyDay(saved.day).afterSalah, ...last })
    kept.day = { ...saved, afterSalah: { ...saved.afterSalah, isDone: true } }
    await clock.advance(60_000)
    expect({ stage: 4, visible: await title('morning') }).toEqual({ stage: 4, visible: true })
    expect((await $.command.run(run('after-salah'))).text).toContain(resetHint('afterSalah'))
    if (surface === 'desktop') expect(String((await ui.find({ in: 'athkar', type: 'Svg' }))?.props.source)).toContain(resetHint('afterSalah'))
    else expect(await ui.find({ in: 'athkar', text: resetHint('afterSalah') })).toBeDefined()
    await $.command.run(run('after-salah reset'))
    saved = kept.day
    expect(saved.afterSalah.pray).toBe('dhuhr')
    expect(saved.afterSalah.at).toBe(last.at)
    await clock.advance(60 * 60_000)
    await $.command.run(run('after-salah'))
    expect(kept.day.afterSalah.pray).toBe('dhuhr')
    await ui.unmount()
  })
}

test('without prayer times there is no automatic offer, including a stale signal; manual uses general counts', async ($, on) => {
  mock.clock(on, { now: NOW })
  mock.store(on, { salahSetupLater: true })
  engine(on, 'terminal')
  const kept = savedDay(on)
  on('state.get', { plugin: 'muslim', key: 'salahLast' }, async () => ({ value: { value: { pray: 'fajr', at: NOW }, version: 0 } }))
  const ui = await $.ui.mount(band('terminal'))
  expect(await ui.find({ in: 'athkar', text: stripTashkeel(TITLE.morning) })).toBeDefined()
  await $.command.run(run('after-salah'))
  await ui.post({ act: 'key', key: 'return' })
  await ui.post({ act: 'key', key: 'space' })
  expect(kept.day.afterSalah.pray).toBe(null)
  await ui.unmount()
})

test('the automatic offer starts at its exact deadline and stays beyond an hour', { options: MUNICH, timeoutMs: 60000 }, async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  mock.store(on)
  engine(on, 'terminal')
  savedDay(on)
  // Deadline is 13:10:01, a second after mounting, rather than the next minute tick.
  const last: SalahLast = { pray: 'dhuhr', at: NOW - IN_MS + 1000 }
  on('state.get', { plugin: 'muslim', key: 'salahLast' }, async (_$, e, next) => {
    const actual = await next(e)
    return { value: { value: last, version: actual.value?.version ?? 0 } }
  })
  const ui = await $.ui.mount(band('terminal'))
  expect(await ui.find({ in: 'athkar', text: stripTashkeel(TITLE.morning) })).toBeDefined()
  await clock.advance(999)
  expect(await ui.find({ in: 'athkar', text: stripTashkeel(TITLE.morning) })).toBeDefined()
  await clock.advance(1)
  expect(await ui.find({ in: 'athkar', text: stripTashkeel(TITLE.afterSalah) })).toBeDefined()
  await clock.advance(2 * 3600_000)
  expect(await ui.find({ in: 'athkar', text: stripTashkeel(TITLE.afterSalah) })).toBeDefined()
  await ui.unmount()
})

test('a reload keeps the saved prayer reading until salah publishes its initial signal', { options: MUNICH, timeoutMs: 15000 }, async ($, on) => {
  const place = { latitude: 48.1372, longitude: 11.5755, timeZone: 'Europe/Berlin' }
  const at = timesOn(place, 'mwl', NO_ADJUST, NOW).dhuhr
  const clock = mock.clock(on, { now: at + IN_MS })
  const day = emptyDay(dayOf(new Date(at)))
  day.afterSalah = { ...day.afterSalah, pray: 'dhuhr', at, counts: { '66-istighfar': 2 } }
  mock.store(on, { athkar: day })
  engine(on, 'terminal')
  const kept = savedDay(on, day)
  const ui = await $.ui.mount(band('terminal'))
  await clock.advance(0)
  expect(await ui.find({ in: 'athkar', text: stripTashkeel(TITLE.afterSalah) })).toBeDefined()
  expect(kept.day.afterSalah.counts['66-istighfar']).toBe(2)
  await $.command.run(run('after-salah'))
  expect(kept.day.afterSalah.at).toBe(at)
  expect(kept.day.afterSalah.counts['66-istighfar']).toBe(2)
  await ui.unmount()
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: a saved place offers after-salah with show off using the real prayer ticker`, { options: { ...MUNICH, salahShow: 'off', salahAthan: true } }, async ($, on) => {
    const place = { latitude: 48.1372, longitude: 11.5755, timeZone: 'Europe/Berlin' }
    const at = timesOn(place, 'mwl', NO_ADJUST, NOW).dhuhr
    const clock = mock.clock(on, { now: at + IN_MS })
    mock.store(on)
    engine(on, surface)
    let published: SalahLast | null | undefined
    on('state.set', { plugin: 'muslim', key: 'salahLast' }, async (_$, e, next) => {
      published = e.value as SalahLast | null
      return next(e)
    })
    const ui = await $.ui.mount(band(surface))
    await clock.advance(0)
    expect(published).toEqual({ pray: 'dhuhr', at })
    if (surface === 'desktop') expect(String((await ui.find({ in: 'athkar', type: 'Svg' }))?.props.source)).toContain(TITLE.afterSalah)
    else expect(await ui.find({ in: 'athkar', text: stripTashkeel(TITLE.afterSalah) })).toBeDefined()
    expect(await ui.find({ key: 'salah-minaret-0' })).toBeUndefined()
    expect(await ui.find({ key: 'salah-athan' })).toBeUndefined()
    await ui.unmount()
  })
}

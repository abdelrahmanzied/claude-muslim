import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import { dayOf, emptyDay, END, listFor, type Day } from '../../src/features/athkar/logic.ts'
import { IDLE_MS } from '../../src/shared/card/card.ts'

const NOW = new Date(2026, 9, 10, 10).getTime()
const FINALE_MS = 3200
const HINT = '/athkar morning reset → to read again'

const band = (surface: 'terminal' | 'desktop') => ({ plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId: 'close-band', props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} } })
const command = (args: string) => ({ command: 'athkar', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })

// The store is shared with a pretend second session through `kept`.
const fixture = (on: On, surface: 'terminal' | 'desktop', day: Day) => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, {})
  const kept = { day }
  on('store.get', async (_$, e) => ({ value: e.key === 'salahSetupLater' ? true : e.key === 'athkar' ? kept.day : e.key === 'arabicTerminals' ? { unknown: 'plain' } : undefined }))
  on('store.set', async (_$, e) => { if (e.key === 'athkar') kept.day = e.value as Day; return { value: undefined } })
  on('session.surface', async () => ({ value: surface }))
  on('config.list', async () => ({ value: [] }))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })

  return { clock, kept }
}

// Morning on its last thikr, one count from done.
const nearlyDone = () => {
  const day = emptyDay(dayOf(new Date(NOW)))
  const list = listFor('morning'), last = list[list.length - 1]!
  day.morning.index = list.length - 1
  day.morning.counts = Object.fromEntries(list.map(t => [t.id, t.times]))
  day.morning.counts[last.id] = last.times - 1

  return day
}

const doneDay = () => {
  const day = emptyDay(dayOf(new Date(NOW)))
  day.morning = { ...day.morning, isDone: true, updatedAt: NOW - 1000 }

  return day
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: finished in front of the person plays the finale for FINALE_MS, then the band is gone`, async ($, on) => {
    const { clock, kept } = fixture(on, surface, nearlyDone())
    const ui = await $.ui.mount(band(surface))
    const props = async () => (await ui.find({ type: 'Client', key: 'athkar' }))?.props.props as { phase: string; finaleMs?: number } | undefined
    await ui.key({ in: 'athkar', key: 'return' }); await ui.key({ in: 'athkar', key: 'return' }); await ui.key({ in: 'athkar', key: 'return' })
    await clock.advance(650)
    expect(kept.day.morning.isDone).toBe(true)
    expect((await props())?.phase).toBe('done')
    if (surface === 'desktop') expect(String((await ui.find({ in: 'athkar', type: 'Svg' }))?.props.source)).toContain('class="fall"')
    else expect(await ui.find({ in: 'athkar', type: 'Text', text: END.replace(/[ً-ٰٟ]/g, '') })).toBeDefined()
    await clock.advance(FINALE_MS - 1)
    expect((await props())?.phase).toBe('done')
    await clock.advance(2)
    expect(await props()).toBeUndefined()
    // Still finished, still closed: nothing takes the band back, however long it rests.
    await clock.advance(IDLE_MS * 2)
    expect(await props()).toBeUndefined()
    await ui.unmount()
  })

  test(`${surface}: a set found done, on a reload or in a new session, never takes the band`, async ($, on) => {
    fixture(on, surface, doneDay())
    const ui = await $.ui.mount(band(surface))
    expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
    await ui.unmount()
  })

  test(`${surface}: another session finishing the set closes this one quietly at its next refresh, with no finale`, async ($, on) => {
    const day = emptyDay(dayOf(new Date(NOW)))
    const { clock, kept } = fixture(on, surface, day)
    const ui = await $.ui.mount(band(surface))
    // Wake, open, count: this session now holds a copy of the day.
    for (let i = 0; i < 3; i++) await ui.key({ in: 'athkar', key: 'return' })
    expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeDefined()
    kept.day = { ...kept.day, morning: { ...kept.day.morning, isDone: true, updatedAt: NOW + 5000 } }
    await ui.post({ act: 'enter' })
    await clock.advance(0)
    expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
    await ui.unmount()
  })

  test(`${surface}: /athkar on a finished set shows the done row with the reset hint, then closes on rest`, async ($, on) => {
    const { clock } = fixture(on, surface, doneDay())
    const ui = await $.ui.mount(band(surface))
    expect((await $.command.run(command('morning'))).text).toContain(HINT)
    const props = async () => (await ui.find({ type: 'Client', key: 'athkar' }))?.props.props as { phase: string; endHint: string; finaleMs?: number } | undefined
    expect(await props()).toMatchObject({ phase: 'done', endHint: HINT, isActive: true })
    expect((await props())?.finaleMs).toBeUndefined()
    await clock.advance(IDLE_MS + 1)
    expect(await props()).toBeUndefined()
    await ui.unmount()
  })

  test(`${surface}: reset right after finishing, during the finale, goes back to the cover`, async ($, on) => {
    const { clock, kept } = fixture(on, surface, nearlyDone())
    const ui = await $.ui.mount(band(surface))
    const props = async () => (await ui.find({ type: 'Client', key: 'athkar' }))?.props.props as { phase: string } | undefined
    for (let i = 0; i < 3; i++) await ui.key({ in: 'athkar', key: 'return' })
    await clock.advance(650)
    expect(await props()).toMatchObject({ phase: 'done' })
    await $.command.run(command('morning reset'))
    expect(kept.day.morning.isDone).toBe(false)
    expect(await props()).toMatchObject({ phase: 'cover' })
    // The finale's timer firing later changes nothing.
    await clock.advance(FINALE_MS + 1)
    expect(await props()).toMatchObject({ phase: 'cover' })
    await ui.unmount()
  })
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: after-salah finished with morning already done plays its finale, then nothing shows`, async ($, on) => {
    const day = emptyDay(dayOf(new Date(NOW)))
    day.morning = { ...day.morning, isDone: true, updatedAt: NOW - 1000 }
    const list = listFor('afterSalah', day.afterSalah), last = list[list.length - 1]!
    day.afterSalah = { ...day.afterSalah, index: list.length - 1, counts: Object.fromEntries(list.map(t => [t.id, t.times])) }
    day.afterSalah.counts[last.id] = last.times - 1
    const { clock } = fixture(on, surface, day)
    const ui = await $.ui.mount(band(surface))
    const props = async () => (await ui.find({ type: 'Client', key: 'athkar' }))?.props.props as { phase: string; period: string } | undefined
    await $.command.run(command('after-salah'))
    for (let i = 0; i < 3; i++) await ui.key({ in: 'athkar', key: 'return' })
    await clock.advance(650)
    expect(await props()).toMatchObject({ phase: 'done', period: 'afterSalah' })
    await clock.advance(FINALE_MS + 1)
    expect(await props()).toBeUndefined()
    await ui.unmount()
  })
}

import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { SalahLast } from '../../types'
import { IN_MS } from '../../src/shared/pray/line.ts'
import { NO_ADJUST, timesOn } from '../../src/features/salah/times.ts'
import { athkarRow, athkarRowTop, cardRects } from '../../src/features/muslim-pane/layout.ts'
import { quranLayout, type PaneModel } from '../../src/features/muslim-pane/model.ts'

const SURFACES = ['desktop', 'terminal'] as const
const NOW = new Date(2026, 9, 10, 16, 59, 58).getTime()
const MUNICH = { salahPlace: 'Munich; 48.1372, 11.5755; Europe/Berlin; DE', salahShow: 'off' }
const band = (surface: typeof SURFACES[number]) => ({
  plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId: 'first-run',
  props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} },
})
const run = (args: string) => ({ command: 'athkar', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })
const engine = (on: On, now: number, surface: typeof SURFACES[number], saved: Record<string, unknown> = {}) => {
  mock.env(on, {})
  mock.store(on, saved)
  const clock = mock.clock(on, { now })
  on('session.surface', async () => ({ value: surface }))
  on('config.list', async () => ({ value: [] }))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box key="engine-band" />
  })
  return clock
}

test('the Muslim pane opens a reader while setup is pending, before the band first draws', async ($, on) => {
  engine(on, NOW, 'desktop')
  on('ui.render', { component: 'Pane', requestId: 'muslim' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
  const pane = await $.ui.mount({ plugin: 'muslim', component: 'Pane', requestId: 'muslim', surface: 'desktop', props: { title: 'Muslim', isFocused: false, bodyColumns: 50, placement: 'dock', scroll: { offset: 0, bodyRows: 100 }, view: {} } })
  await pane.resize({ columns: 50, rows: 100, in: 'muslim-pane' })
  const model = (await pane.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
  const rects = cardRects(model.folds, model.settings.state, model.settings.options, quranLayout(model), model.athkarMenu)
  const target = athkarRow(420).open
  const fine = { x: (target.x0 + target.x1) / 2 * 50 / 420, y: (rects.athkarY + athkarRowTop(model.athkarMenu) + 18) * 100 / rects.height }
  await pane.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: Math.floor(fine.x), y: Math.floor(fine.y), fine })
  const ui = await $.ui.mount(band('desktop'))
  expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'morning', isActive: true })
  expect(await ui.find({ key: 'salah-setup' })).toBeDefined()
  await ui.unmount()
  await pane.unmount()
})

for (const surface of SURFACES) {
  test(`${surface}: fresh install shows setup alone, even with the prayer footer off`, { options: { salahShow: 'off' } }, async ($, on) => {
    engine(on, NOW, surface)
    const ui = await $.ui.mount(band(surface))
    expect(await ui.find({ key: 'salah-setup' })).toBeDefined()
    expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
    expect(await ui.find({ key: 'engine-band' })).toBeDefined()
    await ui.unmount()
  })

  test(`${surface}: Not now closes the current period; the exact next period opens`, async ($, on) => {
    const clock = engine(on, NOW, surface)
    const ui = await $.ui.mount(band(surface))
    await ui.press({ key: 'salah-later' })
    expect(await ui.find({ key: 'salah-setup' })).toBeUndefined()
    expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
    await clock.advance(1999)
    expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
    await clock.advance(1)
    expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'evening' })
    await ui.unmount()
  })

  for (const args of ['', 'morning', 'evening', 'after-salah', 'morning reset']) {
    test(`${surface}: /athkar ${args} opens while setup is pending`, async ($, on) => {
      engine(on, NOW, surface)
      const ui = await $.ui.mount(band(surface))
      expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
      await $.command.run(run(args))
      expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeDefined()
      expect(await ui.find({ key: 'salah-setup' })).toBeDefined()
      await ui.unmount()
    })
  }

  test(`${surface}: a saved answer survives reload, skips its period, and opens at Maghrib`, { options: MUNICH }, async ($, on) => {
    const times = timesOn({ latitude: 48.1372, longitude: 11.5755, timeZone: 'Europe/Berlin' }, 'mwl', NO_ADJUST, NOW)
    const answer = times.maghrib - 2000
    const clock = engine(on, answer, surface, { 'firstRun.remindFrom': answer })
    // Isolate period wake-up from the independently ticked after-salah offer.
    on('state.get', { plugin: 'muslim', key: 'salahLast' }, async () => ({ value: { value: null, version: 1 } }))
    const ui = await $.ui.mount(band(surface))
    await clock.settle()
    expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
    await clock.advance(1999)
    expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
    await clock.advance(1)
    expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'evening' })
    await ui.unmount()
  })

  test(`${surface}: an earlier athan stays quiet even when its offer starts after the answer; a new athan opens`, { options: MUNICH }, async ($, on) => {
    const clock = engine(on, NOW, surface, { 'firstRun.remindFrom': NOW })
    let last: SalahLast = { pray: 'dhuhr', at: NOW - IN_MS + 1000 }
    on('state.get', { plugin: 'muslim', key: 'salahLast' }, async (_$, e, next) => {
      const actual = await next(e)
      return { value: { value: last, version: actual.value?.version ?? 0 } }
    })
    const ui = await $.ui.mount(band(surface))
    await clock.advance(1000)
    expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
    last = { pray: 'asr', at: NOW + 1000 }
    await clock.advance(60_000)
    await clock.advance(IN_MS - 60_000)
    expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'afterSalah' })
    await ui.unmount()
  })

  test(`${surface}: matching athan-card request bypasses an older athan cutoff`, { options: MUNICH }, async ($, on) => {
    engine(on, NOW, surface, { 'firstRun.remindFrom': NOW })
    const last = { pray: 'asr' as const, at: NOW - 1000 }
    on('state.get', { plugin: 'muslim', key: 'salahLast' }, async () => ({ value: { value: last, version: 1 } }))
    on('state.get', { plugin: 'muslim', key: 'salahAfterSalahStart' }, async () => ({ value: { value: last, version: 1 } }))
    const ui = await $.ui.mount(band(surface))
    expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'afterSalah', phase: 'reading' })
    await ui.unmount()
  })

  test(`${surface}: an athan exactly at the answer time opens after the normal delay`, { options: MUNICH }, async ($, on) => {
    const clock = engine(on, NOW, surface, { 'firstRun.remindFrom': NOW })
    on('state.get', { plugin: 'muslim', key: 'salahLast' }, async () => ({ value: { value: { pray: 'asr', at: NOW }, version: 1 } }))
    const ui = await $.ui.mount(band(surface))
    await clock.advance(IN_MS - 1)
    expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
    await clock.advance(1)
    expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'afterSalah' })
    await ui.unmount()
  })

  for (const saved of [{ salahSetupLater: true }, {}]) {
    test(`${surface}: legacy ${saved.salahSetupLater ? 'Not now' : 'city'} without a timestamp opens automatically`, { options: saved.salahSetupLater ? {} : MUNICH }, async ($, on) => {
      engine(on, NOW, surface, saved)
      const ui = await $.ui.mount(band(surface))
      expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeDefined()
      await ui.unmount()
    })
  }
}

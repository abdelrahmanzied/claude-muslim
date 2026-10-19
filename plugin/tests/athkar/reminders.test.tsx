import { IN_MS } from '../../src/shared/pray/line.ts'
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Day, SalahLast } from '../../types'
import { dayOf, emptyDay, TITLE } from '../../src/features/athkar/logic.ts'
import { timesOn, NO_ADJUST } from '../../src/features/salah/times.ts'
import { stripTashkeel } from '../../src/shared/arabic/visual.ts'
import { athkarHelp } from '../../src/features/athkar/help.ts'
import { MISSING_CONFIG } from '../../src/shared/reload/config.ts'
import { configRows } from '../fixtures/config.ts'

const NOW = new Date(2026, 9, 10, 13, 10).getTime()
const MUNICH = { salahPlace: 'Munich, Germany; 48.1372, 11.5755; Europe/Berlin; DE', salahAthan: false }
const FAJR = timesOn({ latitude: 48.1372, longitude: 11.5755, timeZone: 'Europe/Berlin' }, 'mwl', NO_ADJUST, NOW).fajr
const run = (args: string) => ({ command: 'athkar', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })
const band = {
  plugin: 'muslim', surface: 'terminal' as const, component: 'AbovePrompt' as const, requestId: 'reminders-band',
  props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} },
}
const engine = (on: On, day: Day, rows: () => readonly unknown[] = () => []) => {
  mock.env(on, {})
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' }, athkar: day })
  on('session.surface', async () => ({ value: 'terminal' }))
  on('config.list', async () => ({ value: rows() as never }))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  const last: SalahLast = { pray: 'fajr', at: FAJR }
  on('state.get', { plugin: 'muslim', key: 'salahLast' }, async (_$, e, next) => {
    const actual = await next(e)
    return { value: { value: last, version: actual.value?.version ?? 0 } }
  })
}
const shows = async (ui: { find: (q: object) => Promise<unknown> }, set: keyof typeof TITLE) =>
  (await ui.find({ in: 'athkar', text: stripTashkeel(TITLE[set]) })) !== undefined

test('after-salah reminder off: morning keeps the band at the offer time; the command still opens it', { options: { ...MUNICH, athkarAfterSalah: false } }, async ($, on) => {
  mock.clock(on, { now: FAJR + IN_MS + 1000 })
  engine(on, emptyDay(dayOf(new Date(NOW))))
  const ui = await $.ui.mount(band)
  expect(await shows(ui, 'morning')).toBe(true)
  expect(await shows(ui, 'afterSalah')).toBe(false)
  await $.command.run(run('after-salah'))
  expect(await shows(ui, 'afterSalah')).toBe(true)
  await ui.unmount()
})

test('morning reminder off: nothing opens by itself; the command still opens it', { options: { ...MUNICH, athkarMorning: false } }, async ($, on) => {
  mock.clock(on, { now: FAJR + 2 * IN_MS + 1000 })
  engine(on, emptyDay(dayOf(new Date(NOW))))
  const ui = await $.ui.mount(band)
  expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
  await $.command.run(run('morning'))
  expect(await shows(ui, 'morning')).toBe(true)
  await ui.unmount()
})

test('morning reminder off keeps a reading already begun', { options: { ...MUNICH, athkarMorning: false } }, async ($, on) => {
  mock.clock(on, { now: FAJR + 2 * IN_MS + 1000 })
  const day = emptyDay(dayOf(new Date(NOW)))
  day.morning = { ...day.morning, counts: { '75': 1 } }
  engine(on, day)
  const ui = await $.ui.mount(band)
  expect(await shows(ui, 'morning')).toBe(true)
  await ui.unmount()
})

test('/athkar <set> on · off writes that reminder, and a missing row changes nothing', async ($, on) => {
  mock.clock(on, { now: NOW })
  let rows = configRows
  engine(on, emptyDay(dayOf(new Date(NOW))), () => rows)
  const sets: { key: string; value: unknown }[] = []
  on('config.set', async (_$, e) => { sets.push({ key: e.key, value: e.value }); return { value: e.value } })
  expect((await $.command.run(run('morning off'))).text).toBe('morning athkar reminder off')
  expect((await $.command.run(run('evening on'))).text).toBe('evening athkar reminder on')
  expect((await $.command.run(run('after-salah off'))).text).toBe('Athkar after salah reminder off')
  expect(sets).toEqual([
    { key: 'muslim.athkarMorning', value: false },
    { key: 'muslim.athkarEvening', value: true },
    { key: 'muslim.athkarAfterSalah', value: false },
  ])
  rows = []
  expect((await $.command.run(run('morning on'))).text).toBe(MISSING_CONFIG)
  expect(sets).toHaveLength(3)
})

test('/athkar on · off is gone: it answers with help and writes nothing', async ($, on) => {
  mock.clock(on, { now: NOW })
  engine(on, emptyDay(dayOf(new Date(NOW))), () => configRows)
  const sets: unknown[] = []
  on('config.set', async (_$, e) => { sets.push(e.key); return { value: e.value } })
  for (const word of ['on', 'off']) expect((await $.command.run(run(word))).text).toBe(athkarHelp())
  expect(sets).toEqual([])
})

import { runPanelAction } from '../../src/shared/panel/signal.ts'
import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
import { athkarTimes, NO_ADJUST, timesOn } from '../../src/features/salah/times.ts'
import { dayOf, emptyDay, listFor, readDay } from '../../src/features/athkar/logic.ts'
import type { Day, SalahLast } from '../../types'
const place = { latitude: 48.1372, longitude: 11.5755, timeZone: 'Europe/Berlin' }
const options = { salahPlace: 'Munich, Germany; 48.1372, 11.5755; Europe/Berlin; DE', salahAthan: false, salahShow: 'off' }
const run = (args: string) => ({ command: 'athkar', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })
const band = { plugin: 'muslim', surface: 'terminal' as const, component: 'AbovePrompt' as const, requestId: 'release', props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} } }
function fixture(on: On, initial: Day, last: SalahLast | null = null, pending = false) {
  mock.env(on, {})
  mock.store(on, { athkar: initial, arabicTerminals: { unknown: 'plain' }, ...(!pending ? { salahSetupLater: true } : {}) })
  on('session.surface', async () => ({ value: 'terminal' }))
  on('config.list', async () => ({ value: [] }))
  const kept = { day: initial, last }
  on('state.get', { plugin: 'muslim', key: 'athkar' }, async (_$, e, next) => { const result = await next(e); return { value: { value: kept.day, version: result.value?.version ?? 0 } } })
  on('state.set', { plugin: 'muslim', key: 'athkar' }, async (_$, e, next) => { const result = await next(e); kept.day = e.value as Day; return result })
  on('state.get', { plugin: 'muslim', key: 'salahLast' }, async () => ({ value: { value: kept.last, version: 0 } }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
  return kept
}
test('bare athkar crosses Maghrib without holding the morning set', { options }, async ($, on) => {
  const times = timesOn(place, 'mwl', NO_ADJUST, Date.parse('2026-10-10T10:00:00Z'))
  const clock = mock.clock(on, { now: times.maghrib - 1000 })
  fixture(on, emptyDay('2026-10-10'))
  await $.command.run(run(''))
  const ui = await $.ui.mount(band)
  expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'morning' })
  await clock.advance(1000)
  expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'evening' })
  await ui.unmount()
})
test('bare athkar does not prevent the next after-salah offer', { options }, async ($, on) => {
  const at = timesOn(place, 'mwl', NO_ADJUST, Date.parse('2026-10-10T10:00:00Z')).dhuhr
  const clock = mock.clock(on, { now: at + 15 * 60_000 - 1000 })
  fixture(on, emptyDay('2026-10-10'), { pray: 'dhuhr', at })
  await $.command.run(run(''))
  const ui = await $.ui.mount(band)
  await clock.advance(1000)
  expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'afterSalah' })
  await ui.unmount()
})
test('explicit evening holds across Fajr', { options }, async ($, on) => {
  const times = timesOn(place, 'mwl', NO_ADJUST, Date.parse('2026-10-10T10:00:00Z'))
  const clock = mock.clock(on, { now: times.fajr - 1000 })
  fixture(on, emptyDay('2026-10-09'))
  await $.command.run(run('evening'))
  const ui = await $.ui.mount(band)
  await clock.advance(1000)
  expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'evening' })
  await ui.unmount()
})
test('finish question survives redraw between 05:00 and the saved place Fajr', { options }, async ($, on) => {
  const now = Date.parse('2026-10-10T03:15:00Z') // Munich 05:15, Fajr 05:42
  mock.clock(on, { now })
  const day = emptyDay(dayOf(new Date(now), athkarTimes(place, 'mwl', NO_ADJUST, now)))
  day.evening.index = listFor('evening').length - 1
  fixture(on, day)
  await $.command.run(run('evening'))
  const ui = await $.ui.mount(band)
  await ui.key({ key: 'return', in: 'athkar' })
  await ui.key({ key: 'left', in: 'athkar' })
  expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ phase: 'question' })
  await ui.unmount()
})
test('counted Isha survives a reload at 00:10 with a null last-prayer signal', { options }, async ($, on) => {
  const now = Date.parse('2026-10-10T22:10:00Z')
  mock.clock(on, { now })
  const day = emptyDay('2026-10-10')
  day.afterSalah = { ...day.afterSalah, pray: 'isha', at: Date.parse('2026-10-10T21:30:00Z'), counts: { '66-istighfar': 2 } }
  const kept = fixture(on, day)
  // A real fresh-install setup answer is non-null, so a missing last signal
  // must not make this already-begun reading automatic/quiet again.
  on('state.get', { plugin: 'muslim', key: 'firstRunRemindFrom' }, async () => ({ value: { value: now - 24 * 3600_000, version: 1 } }))
  const ui = await $.ui.mount(band)
  expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'afterSalah' })
  expect(kept.day.afterSalah).toEqual(day.afterSalah)
  await ui.unmount()
})
test('a begun after-salah slot wins over a half-read morning after reload', { options }, async ($, on) => {
  const now = Date.parse('2026-10-10T12:00:00Z'), at = timesOn(place, 'mwl', NO_ADJUST, now).dhuhr
  mock.clock(on, { now })
  const day = emptyDay('2026-10-10')
  day.morning.counts['75'] = 1
  day.afterSalah = { ...day.afterSalah, pray: 'dhuhr', at, counts: { '66-istighfar': 1 } }
  fixture(on, day, { pray: 'dhuhr', at })
  const ui = await $.ui.mount(band)
  expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'afterSalah' })
  await ui.unmount()
})
for (const pending of [true, false]) test(`athkar explicit open setup hint: pending=${pending}`, async ($, on) => {
  const now = new Date(2026, 9, 10, 10).getTime()
  mock.clock(on, { now }); fixture(on, emptyDay(dayOf(new Date(now))), null, pending)
  const reply = await $.command.run(run('morning'))
  expect(reply.text?.includes('once the setup above is answered')).toBe(pending)
})
test('old store shapes fall back to a fresh day', () => {
  const old = { day: '2026-10-10', morning: { index: 8, counts: { '75': 1 }, choices: {} }, evening: {} }
  expect(readDay(old, old.day)).toEqual(emptyDay(old.day))
})
for (const action of ['athkar-open', 'athkar-reset', 'athkar-set'] as const) test(`pane ${action} of the current set does not hold it through Maghrib`, { options }, async ($, on) => {
  const maghrib = timesOn(place, 'mwl', NO_ADJUST, Date.parse('2026-10-10T10:00:00Z')).maghrib
  const clock = mock.clock(on, { now: maghrib - 1000 }); fixture(on, emptyDay('2026-10-10'))
  const ui = await $.ui.mount(band)
  await runPanelAction(action, action === 'athkar-set' ? 'morning' : undefined)
  await clock.advance(1000)
  expect((await ui.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ period: 'evening' })
  await ui.unmount()
})
for (const surface of ['desktop', 'terminal'] as const) for (const style of ['sky', 'frame'] as const) test(`${surface} ${style}: the minute sky clock runs only while its sky is drawn`, { options: { athkarStyle: style } }, async ($, on) => {
  const now = new Date(2026, 9, 10, 10).getTime()
  let minuteWaits = 0
  on('clock.every', { ms: 60000 }, async (_$, e, next) => { minuteWaits++; return next(e) })
  const clock = mock.clock(on, { now }); fixture(on, emptyDay(dayOf(new Date(now))))
  const ui = await $.ui.mount({ ...band, surface })
  await clock.advance(60000)
  expect(minuteWaits > 0).toBe(surface === 'desktop' && style === 'sky')
  // Hiding the reading redraws with no sky; no new minute timer may be armed.
  const before = minuteWaits
  await ui.post({ act: 'hide' }, { in: 'athkar' })
  await ui.redraw()
  await clock.advance(60000)
  expect(minuteWaits).toBe(before)
  await ui.unmount()
})
test('desktop card resizes immediately without waiting for a size poll', async ($, on) => {
  const now = new Date(2026, 9, 10, 10).getTime(), clock = mock.clock(on, { now })
  fixture(on, emptyDay(dayOf(new Date(now))))
  const ui = await $.ui.mount({ ...band, surface: 'desktop' })
  await ui.resize({ in: 'athkar', columns: 50, rows: 6 })
  await ui.resize({ in: 'athkar', columns: 100, rows: 6 })
  // The picture asks for the widest Svg; the desktop narrows it to the slot, so a resize redraws at once with the same request.
  expect((await ui.find({ in: 'athkar', type: 'Svg' }))!.props.width).toBe(4096)
  expect((await ui.find({ in: 'athkar', type: 'Svg' }))!.props.source).toContain('width="100%"')
  expect(clock.now()).toBe(now)
  await ui.unmount()
})

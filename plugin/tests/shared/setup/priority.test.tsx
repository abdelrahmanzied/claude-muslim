import { USAGE_LIMIT } from '../../../src/features/thikr/phrases.ts'
import { terminalArabic } from '../../../src/shared/arabic/terminal.ts'
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import { ATHKAR_QUIET, configRows } from '../../fixtures/config.ts'
import { ADVANCE_MS, dayOf, emptyDay, listFor, timesOf } from '../../../src/features/athkar/logic.ts'
import type { Day } from '../../../types/index.d.ts'
import { setupForm } from '../../../src/shared/setup/visibility.ts'

const NOW = new Date(2026, 9, 10, 10).getTime()
const MUNICH = 'Munich; 48.1372, 11.5755; Europe/Berlin; DE'
const band = (surface: 'desktop' | 'terminal') => ({ plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId: 'priority', props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} } })
const command = (name: string, args: string) => ({ command: name, args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })
const fixture = (on: On, surface: 'desktop' | 'terminal', saved: Record<string, unknown> = {}) => {
  mock.env(on, {})
  const clock = mock.clock(on, { now: NOW })
  const store: Record<string, unknown> = { arabicTerminals: { unknown: 'plain' }, ...saved }
  const writes: unknown[] = []
  on('store.get', async (_$, e) => ({ value: store[e.key] }))
  on('store.set', async (_$, e) => { store[e.key] = e.value; writes.push(e); return { value: undefined } })
  on('config.list', async () => ({ value: configRows }))
  on('config.set', async (_$, e) => ({ value: e.value }))
  on('session.surface', async () => ({ value: surface }))
  on('ui.toast', async () => ({ value: undefined }))
  on('fs.read', async () => ({ value: { base64: 'QUJD' } }))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
  return { clock, store, writes }
}
const reading = (count = 1) => {
  const day = emptyDay(dayOf(new Date(NOW)))
  day.morning.index = listFor('morning').findIndex(t => timesOf(t) === 3)
  day.morning.counts[listFor('morning')[day.morning.index]!.id] = count
  return day
}

test('setup visibility uses one priority decision for the forms and every reminder', () => {
  const input = { surface: 'desktop', hasSurvey: false, hasPlace: false, hasReview: false, later: false }
  expect(setupForm(input)).toBe('city')
  expect(setupForm({ ...input, later: true })).toBeNull()
  expect(setupForm({ ...input, hasPlace: true, hasReview: true })).toBe('review')
  const terminal = { id: 'VTE', manual: null, saved: undefined }
  expect(setupForm({ ...input, surface: 'terminal', hasPlace: true, hasReview: true, terminal })).toBe('arabic')
  expect(setupForm({ ...input, hasSurvey: true })).toBe('survey')
  expect(setupForm({ ...input, hasPlace: true, terminal })).toBeNull()
})

for (const surface of ['desktop', 'terminal'] as const) for (const close of ['skip', 'save'] as const) test(`${surface}: review hides an in-progress reading until ${close}, keeping its counts`, { options: { salahPlace: MUNICH } }, async ($, on) => {
  const day = reading()
  const { clock, store, writes } = fixture(on, surface, { athkar: day })
  await $.command.run(command('athkar', 'morning'))
  const ui = await $.ui.mount(band(surface))
  for (let i = 0; i < 3 && ((await ui.find({ key: 'athkar' }))?.props.props as { phase?: string } | undefined)?.phase !== 'reading'; i++) await ui.post({ act: 'key', key: 'return' })
  expect(((await ui.find({ key: 'athkar' }))?.props.props as { phase?: string } | undefined)?.phase).toBe('reading')
  const before = JSON.stringify(store.athkar)
  await $.command.run(command('salah', 'adjust'))
  expect(await ui.find({ key: 'salah-save' })).toBeDefined()
  expect(await ui.find({ key: 'athkar-band' })).toBeUndefined()
  const writesBefore = writes.length
  await clock.advance(2000)
  expect(JSON.stringify(store.athkar)).toBe(before)
  expect(writes).toHaveLength(writesBefore)
  await ui.press({ key: `salah-${close}` })
  expect(await ui.find({ key: 'salah-save' })).toBeUndefined()
  expect(await ui.find({ key: 'athkar-band' })).toBeDefined()
  expect((store.athkar as Day).morning).toEqual(day.morning)
  await ui.unmount()
})

test('a count awaiting automatic advance stays on its item while review is open', { options: { salahPlace: MUNICH } }, async ($, on) => {
  const day = reading(2)
  const { clock, store } = fixture(on, 'desktop', { athkar: day })
  await $.command.run(command('athkar', 'morning'))
  const ui = await $.ui.mount(band('desktop'))
  for (let i = 0; i < 3 && ((await ui.find({ key: 'athkar' }))?.props.props as { phase?: string } | undefined)?.phase !== 'reading'; i++) await ui.post({ act: 'key', key: 'return' })
  await ui.post({ act: 'key', key: 'return' })
  await $.command.run(command('salah', 'adjust'))
  await clock.advance(ADVANCE_MS + 1)
  expect((store.athkar as Day).morning.index).toBe(day.morning.index)
  expect(Object.values((store.athkar as Day).morning.counts)).toEqual([3])
  await ui.press({ key: 'salah-skip' })
  await clock.advance(ADVANCE_MS + 1)
  expect((store.athkar as Day).morning.index).toBe(day.morning.index)
  await ui.unmount()
})

for (const surface of ['desktop', 'terminal'] as const) test(`${surface}: city setup hides an active athan, which returns inside its window`, { options: { ...ATHKAR_QUIET } }, async ($, on) => {
  fixture(on, surface)
  const card = { pray: 'dhuhr' as const, time: '12:00', foldsAt: NOW + 60_000, isFolded: false, until: NOW + 600_000 }
  const minaret = { pray: 'dhuhr' as const, frame: 7, startedAt: NOW, foldsAt: NOW + 3000, isFolded: false, until: NOW + 600_000 }
  on('state.get', { plugin: 'muslim', key: 'salahCard' }, async () => ({ value: { value: card, version: 1 } }))
  on('state.get', { plugin: 'muslim', key: 'salahMinaret' }, async () => ({ value: { value: minaret, version: 1 } }))
  const ui = await $.ui.mount(band(surface))
  expect(await ui.find({ key: 'salah-setup' })).toBeDefined()
  expect(await ui.find({ key: 'salah-athan-card' })).toBeUndefined()
  expect(await ui.find({ key: 'salah-minaret-0' })).toBeUndefined()
  await ui.press({ key: 'salah-later' })
  expect(await ui.find({ key: 'salah-setup' })).toBeUndefined()
  expect(await ui.find({ key: surface === 'desktop' ? 'salah-athan-card' : 'salah-minaret-0' })).toBeDefined()
  await ui.unmount()
})

test('terminal Arabic setup hides the usage-limit line until all setup is answered', async ($, on) => {
  fixture(on, 'terminal', { arabicTerminals: {} })
  on('state.get', { plugin: 'muslim', key: 'usageLimit' }, async () => ({ value: { value: { until: null }, version: 1 } }))
  const ui = await $.ui.mount(band('terminal'))
  expect(await ui.find({ key: 'arabic-mode-plain' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: terminalArabic('terminal', 'plain', USAGE_LIMIT) })).toBeUndefined()
  await ui.press({ key: 'arabic-mode-plain' })
  expect(await ui.find({ type: 'Text', text: terminalArabic('terminal', 'plain', USAGE_LIMIT) })).toBeUndefined()
  await ui.press({ key: 'salah-later' })
  expect(await ui.find({ type: 'Text', text: terminalArabic('terminal', 'plain', USAGE_LIMIT) })).toBeDefined()
  await ui.unmount()
})

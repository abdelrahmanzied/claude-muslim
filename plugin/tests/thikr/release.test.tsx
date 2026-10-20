import { expect, mock, test } from 'claude-code/testing'
import { terminalArabic } from '../../src/shared/arabic/terminal.ts'
import { USAGE_LIMIT } from '../../src/features/thikr/phrases.ts'
const band = { plugin: 'muslim', surface: 'terminal' as const, component: 'AbovePrompt' as const, requestId: 'limit', props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 80, scroll: { offset: 0, bodyRows: 20 }, view: {} } }
for (const until of [9000, 11000]) test(`reload usage limit with deadline ${until} draws only before expiry`, async ($, on) => {
  const clock = mock.clock(on, { now: 10000 })
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } }); mock.env(on, {})
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
  let saved: { until: number | null } | null = { until }
  on('state.get', { plugin: 'muslim', key: 'usageLimit' }, async (_$, e, next) => { await next(e); return { value: { value: saved, version: 1 } } })
  on('state.set', { plugin: 'muslim', key: 'usageLimit' }, async (_$, e, next) => { saved = e.value!; return next(e) })
  const ui = await $.ui.mount(band)
  expect(!!await ui.find({ type: 'Text', text: terminalArabic('terminal', 'plain', USAGE_LIMIT) })).toBe(until > 10000)
  await clock.advance(1000)
  expect(await ui.find({ type: 'Text', text: terminalArabic('terminal', 'plain', USAGE_LIMIT) })).toBeUndefined()
  await ui.unmount()
})
test('an older usage reset cannot clear a later limit', async ($, on) => {
  const clock = mock.clock(on, { now: 10000 })
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } }); mock.env(on, {})
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
  on('session.measure', async (_$, e) => ({ changed: e.changed }))
  let saved: { until: number | null } | null = { until: 11000 }
  on('state.get', { plugin: 'muslim', key: 'usageLimit' }, async (_$, e, next) => { await next(e); return { value: { value: saved, version: 1 } } })
  on('state.set', { plugin: 'muslim', key: 'usageLimit' }, async (_$, e, next) => { saved = e.value!; return next(e) })
  const ui = await $.ui.mount(band)
  await $.session.measure({ context: { window: 200000 }, changed: ['rateLimits'], rateLimits: [{ kind: 'five_hour', percentUsed: 100, resetsAt: new Date(13000).toISOString() }] })
  await clock.advance(1000)
  expect(await ui.find({ type: 'Text', text: terminalArabic('terminal', 'plain', USAGE_LIMIT) })).toBeDefined()
  expect(saved?.until).toBe(13000)
  await clock.advance(2000)
  expect(await ui.find({ type: 'Text', text: terminalArabic('terminal', 'plain', USAGE_LIMIT) })).toBeUndefined()
  await ui.unmount()
})

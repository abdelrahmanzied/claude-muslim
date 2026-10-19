import { expect, mock, test } from 'claude-code/testing'
import { dayOf, emptyDay, listFor, timesOf } from '../../src/features/athkar/logic.ts'
import type { Day } from '../../types/index.d.ts'

for (const surface of ['terminal', 'desktop'] as const) for (const fails of [false, true]) test(`overlapping count presses on ${surface}, first save fails=${fails}`, async ($, on) => {
  const now = new Date(2026, 9, 10, 10).getTime()
  mock.clock(on, { now })
  mock.env(on, {})
  const day = emptyDay(dayOf(new Date(now)))
  const list = listFor('morning')
  day.morning.index = list.findIndex(t => timesOf(t) === 3)
  const id = list[day.morning.index]!.id
  const stored: Record<string, unknown> = { salahSetupLater: true, athkar: day, arabicTerminals: { unknown: 'plain' } }
  let state: Day | null = null
  on('state.set', { plugin: 'muslim', key: 'athkar' }, async (_$, e, next) => { state = e.value; return next(e) })
  on('store.get', async (_$, e) => ({ value: stored[e.key] }))
  let firstSave = true
  on('store.set', async (_$, e) => {
    if (e.key === 'athkar' && fails && firstSave) { firstSave = false; return { deny: 'temporary save failure' } }
    stored[e.key] = e.value
    return { value: undefined }
  })
  on('session.surface', async () => ({ value: surface }))
  on('config.list', async () => ({ value: [] }))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
  await $.command.run({ command: 'athkar', args: 'morning', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  const ui = await $.ui.mount({ plugin: 'muslim', surface, component: 'AbovePrompt', requestId: 'counts', props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 80, scroll: { offset: 0, bodyRows: 20 }, view: {} } })
  await ui.post({ act: 'key', key: 'return' }) // Wake after focus moved to the setup row.
  await ui.post({ act: 'key', key: 'return' }) // Open the cover.
  await Promise.all([ui.post({ act: 'key', key: 'return' }), ui.post({ act: 'key', key: 'return' })])
  expect((stored.athkar as Day).morning.counts[id]).toBe(2)
  expect((state as Day | null)?.morning.counts[id]).toBe(2)
  await ui.unmount()
})

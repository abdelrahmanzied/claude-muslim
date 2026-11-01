import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { dayOf, emptyDay, listFor, TITLE } from '../../src/features/athkar/logic.ts'
import { stripTashkeel } from '../../src/shared/arabic/visual.ts'
import type { Day } from '../../types/index.d.ts'

const NOW = new Date(2026, 9, 10, 10).getTime()
const id = listFor('morning').find(t => t.times === 3)!.id

// Two sessions share one store; this is the one under test, the other writes to the store directly.
const setup = (on: On, surface: 'terminal' | 'desktop') => {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, {})
  const day = emptyDay(dayOf(new Date(NOW)))
  day.morning.index = listFor('morning').findIndex(t => t.id === id)
  const stored: Record<string, unknown> = { salahSetupLater: true, athkar: day, arabicTerminals: { unknown: 'plain' } }
  const seen: Day[] = []
  const reads: string[] = []
  on('state.set', { plugin: 'muslim', key: 'athkar' }, async (_$, e, next) => { seen.push(e.value as Day); return next(e) })
  on('store.get', async (_$, e) => { reads.push(e.key); return { value: stored[e.key] } })
  on('store.set', async (_$, e) => { stored[e.key] = e.value; return { value: undefined } })
  on('session.surface', async () => ({ value: surface }))
  on('config.list', async () => ({ value: [] }))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
  const other = (counts: Record<string, number>, over: Record<string, unknown> = {}) => {
    const current = stored.athkar as Day
    stored.athkar = { ...current, morning: { ...current.morning, counts, updatedAt: NOW + 5000, ...over } }
  }
  const band = { plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId: 'sync-refresh', props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 80, scroll: { offset: 0, bodyRows: 20 }, view: {} } }

  return { clock, stored, seen, reads, other, band }
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: a command picks up another session's progress`, async ($, on) => {
    const s = setup(on, surface)
    await $.command.run({ command: 'athkar', args: 'morning', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
    const ui = await $.ui.mount(s.band)
    for (let i = 0; i < 3; i++) await ui.post({ act: 'key', key: 'return' }) // wake, open, count: this session now holds a copy
    s.other({ [id]: 2 })
    await $.command.run({ command: 'athkar', args: 'morning', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
    expect(s.seen.at(-1)?.morning.counts[id]).toBe(2)
    await ui.unmount()
  })

  test(`${surface}: unfolding and a press refresh from the store first`, async ($, on) => {
    const s = setup(on, surface)
    await $.command.run({ command: 'athkar', args: 'morning', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
    const ui = await $.ui.mount(s.band)
    await ui.post({ act: 'key', key: 'return' })
    await ui.post({ act: 'key', key: 'return' })
    await ui.post({ act: 'leave' })
    await s.clock.advance(1200)
    s.other({ [id]: 2 })
    await ui.pointer({ type: 'down', x: 40, y: 0, button: 'left' })
    expect(s.seen.at(-1)?.morning.counts[id]).toBe(2)
    await ui.unmount()
  })

  test(`${surface}: hovering the band refreshes`, async ($, on) => {
    const s = setup(on, surface)
    await $.command.run({ command: 'athkar', args: 'morning', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
    const ui = await $.ui.mount(s.band)
    for (let i = 0; i < 3; i++) await ui.post({ act: 'key', key: 'return' }) // wake, open, count: this session now holds a copy
    s.other({ [id]: 2 })
    await ui.post({ act: 'enter' })
    expect(s.seen.at(-1)?.morning.counts[id]).toBe(2)
    await ui.unmount()
  })

  test(`${surface}: a folded reading shows the set title, never the thikr`, async ($, on) => {
    const s = setup(on, surface)
    await $.command.run({ command: 'athkar', args: 'morning', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
    const ui = await $.ui.mount(s.band)
    await ui.post({ act: 'key', key: 'return' })
    await ui.post({ act: 'key', key: 'return' })
    await ui.post({ act: 'key', key: 'return' })
    await ui.post({ act: 'leave' })
    await s.clock.advance(1200)
    if (surface === 'desktop') {
      const svg = String((await ui.find({ in: 'athkar', type: 'Svg' }))?.props.source ?? '')
      expect(svg).toContain('class="peek"')
      expect(svg).toContain(TITLE.morning)
      expect(svg).toContain('مِنْ')
    } else {
      const rest = await ui.find({ in: 'athkar', key: 'rest' })
      expect(rest).toBeDefined()
      expect(await ui.find({ in: 'athkar', text: stripTashkeel(TITLE.morning) })).toBeDefined()
    }
    await ui.unmount()
  })
}

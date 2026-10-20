import type { On, UiScrollInput } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import { PANE_HEIGHT, QURAN_Y, Q_RECITER_BASE, Q_TITLE_TOP } from '../../src/features/muslim-pane/layout.ts'

const pane = (surface: 'desktop' | 'terminal', offset = 0, bodyRows = 40) => ({
  plugin: 'muslim', component: 'Pane' as const, requestId: 'muslim', surface,
  props: { title: 'Muslim', isFocused: false, bodyColumns: 50, placement: 'dock' as const, scroll: { offset, bodyRows }, view: {} },
})
function setup(on: On) {
  mock.env(on, {})
  mock.store(on)
  mock.clock(on, { now: Date.parse('2026-10-10T10:00:00Z') })
  const forwarded: UiScrollInput[] = []
  on('ui.scroll', async (_$, e) => { forwarded.push(e); return {} })
  return forwarded
}
const wheel = (by: number, row?: number): UiScrollInput => ({
  component: 'Pane', requestId: 'muslim', by, offset: 0, bodyRows: 40, contentRows: 40,
  origin: { kind: 'person' }, ...(row === undefined ? {} : { pointer: { column: 25, row } }),
})

test('wheel over the Quran title or reciter row leaves a fitting pane undrawn, with or without coordinates', async ($, on) => {
  const forwarded = setup(on)
  const ui = await $.ui.mount(pane('desktop'))
  await ui.resize({ columns: 50, rows: 40, in: 'muslim-pane' })
  for (const top of [Q_RECITER_BASE + 14, Q_TITLE_TOP]) {
    const row = (QURAN_Y + top + 18) * 40 / PANE_HEIGHT
    await ui.pointer({ in: 'muslim-pane', type: 'move', x: 25, y: Math.floor(row) })
    // The shipped catalog makes these fields active: moving the pointer may
    // draw hover feedback, but the following wheel events must not redraw.
    const before = await ui.drawn({ in: 'muslim-pane' })
    for (const by of [1, -1, 8, -8, 0.2, -0.2]) {
      await $.ui.scroll(wheel(by, row))
      await $.ui.scroll(wheel(by))
    }
    expect(await ui.drawn({ in: 'muslim-pane' })).toEqual(before)
  }
  expect(forwarded).toEqual([])
})

test('a flickering measured row count never posts unused size messages on the frame clock', { plugins: [{
  name: 'muslim-size-observer', tier: 'prepend', register(on) {
    on('ui.message', { element: 'muslim-pane' }, async ($, e, next) => {
      if ((e.data as { act?: string })?.act === 'size') $.ui.toast('Unexpected pane size message')
      return next(e)
    })
  },
}] }, async ($, on) => {
  setup(on)
  const messages: string[] = []
  on('ui.toast', async (_$, e) => { messages.push(e.text); return { value: undefined } })
  const ui = await $.ui.mount(pane('desktop'))
  for (const rows of [40, 41, 40, 41, 40]) {
    await ui.resize({ columns: 50, rows, in: 'muslim-pane' })
    await ui.advance(200)
  }
  expect(messages).toEqual([])
})

test('real overflow still scrolls; repeated ticks at either edge do not redraw', async ($, on) => {
  const forwarded = setup(on)
  const ui = await $.ui.mount(pane('desktop', 0, 20))
  const down = { ...wheel(3), bodyRows: 20, offset: 3 }
  await $.ui.scroll(down)
  expect(forwarded).toEqual([down])
  await ui.redraw(pane('desktop', 3, 20).props)
  await $.ui.scroll({ ...down, by: 0, offset: 3 })
  expect(forwarded).toHaveLength(1)
  await ui.redraw(pane('desktop', 20, 20).props)
  await $.ui.scroll({ ...down, by: 5, offset: 20 })
  expect(forwarded).toHaveLength(1)
  const up = { ...down, by: -3, offset: 17 }
  await $.ui.scroll(up)
  expect(forwarded).toEqual([down, up])
  await ui.redraw(pane('desktop', 0, 20).props)
  await $.ui.scroll({ ...down, by: -5, offset: 0 })
  expect(forwarded).toHaveLength(2)
})

test('terminal, plugin-origin and other-pane scroll requests pass through unchanged', async ($, on) => {
  const forwarded = setup(on)
  const ui = await $.ui.mount(pane('terminal'))
  const event = wheel(1)
  await $.ui.scroll(event)
  await ui.unmount()
  await $.ui.mount(pane('desktop'))
  const plugin = { ...event, origin: { kind: 'plugin' as const, name: 'muslim' } }
  const other = { ...event, requestId: 'other-pane' }
  await $.ui.scroll(plugin)
  await $.ui.scroll(other)
  expect(forwarded).toEqual([event, plugin, other])
})

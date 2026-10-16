import type { On, UiScrollInput } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Mounted } from 'claude-code/testing'
import { fieldTop, LIST_BACK } from '../../src/features/quran/pane.ts'
import { fixtureCatalog } from './fixtures/catalog.ts'

// The Quran pane must not redraw for wheel ticks that cannot move the window
// while every movable tick, including over an open list, reaches the host unchanged.
const pane = (offset = 0, bodyRows = 60) => ({ plugin: 'muslim', component: 'Pane' as const, requestId: 'quran', surface: 'desktop' as const, props: { title: 'القرآن الكريم', isFocused: true, bodyColumns: 50, placement: 'dock' as const, scroll: { offset, bodyRows }, view: {} } })
const ROWS = 60
// Enough reciters that the open list can scroll.
const reciters = Array.from({ length: 40 }, (_, i) => ({ ...fixtureCatalog.reciters[0]!, key: `${i + 1}:20`, name: `Fixture reciter ${i + 1}`, label: `Fixture reciter ${i + 1}` }))
function setup(on: On) {
  mock.env(on, {})
  const store: Record<string, unknown> = { 'quran.catalog': { ...fixtureCatalog, reciters }, 'quran.reciter': '1:20' }
  on('store.get', async (_$, e) => ({ value: store[e.key] }))
  on('store.set', async (_$, e) => { store[e.key] = e.value; return { value: undefined } })
  mock.clock(on, { now: fixtureCatalog.fetchedAt })
  on('session.surface', async () => ({ value: 'desktop' as const }))
  on('ui.open', async () => ({ value: { isPlaced: true } }))
  on('ui.toast', async () => ({ value: undefined }))
  const forwarded: UiScrollInput[] = []
  on('ui.scroll', async (_$, e) => { forwarded.push(e); return {} })
  return forwarded
}
const wheel = (by: number, row: number | undefined, contentRows = ROWS, offset = 0): UiScrollInput => ({
  component: 'Pane', requestId: 'quran', by, offset: offset + by, bodyRows: ROWS, contentRows,
  origin: { kind: 'person' }, ...(row === undefined ? {} : { pointer: { column: 25, row } }),
})
type Ui = Mounted<'desktop' | 'terminal', 'Pane'>
const svgOf = async (ui: Ui) => String((await ui.find({ in: 'quran-card', type: 'Svg' }))?.props.source)
const fit = async (ui: Ui) => { await ui.resize({ columns: 50, rows: ROWS, in: 'quran-card' }); return ui }

test('wheel over a fitting Quran pane, outside an open list, is consumed without a redraw', async ($, on) => {
  const forwarded = setup(on)
  const ui = await fit(await $.ui.mount(pane()))
  const before = await svgOf(ui)
  for (const by of [1, -1, 6, -6, 0.2]) {
    await $.ui.scroll(wheel(by, 2))
    await $.ui.scroll(wheel(by, undefined))
  }
  expect(forwarded).toEqual([])
  expect(await svgOf(ui)).toBe(before)
})

test('real overflow still reaches the host', async ($, on) => {
  const forwarded = setup(on)
  await fit(await $.ui.mount(pane()))
  await $.ui.scroll(wheel(3, 2, ROWS + 20))
  expect(forwarded).toHaveLength(1)
})

test('wheel on an open list page reaches the host unchanged, without pinning or redrawing the list', async ($, on) => {
  const forwarded = setup(on)
  const ui = await fit(await $.ui.mount(pane()))
  const H = Number((await svgOf(ui)).match(/height="(\d+)"/)![1])
  const y = (fieldTop('reciter') + 20) * ROWS / H
  await ui.pointer({ in: 'quran-card', type: 'down', button: 'left', x: 25, y: Math.floor(y), fine: { x: 25, y } })
  const before = await svgOf(ui)
  expect(before).toContain('class="list-page"')
  forwarded.length = 0 // Opening requests start once; wheel input must never request it.
  const rows = Math.ceil(Number((await svgOf(ui)).match(/height="(\d+)"/)![1]) / 19)
  await ui.resize({ columns: 50, rows, in: 'quran-card' })
  for (const event of [wheel(3, 12, rows), wheel(-2, 12, rows, 5), wheel(0.2, undefined, rows)]) {
    await $.ui.scroll(event)
    expect(forwarded.at(-1)).toEqual(event)
  }
  expect(forwarded).toHaveLength(3)
  expect(await svgOf(ui)).toBe(before)
  // Returning asks for start once; no wheel-position or list-offset state exists.
  const backY = (LIST_BACK.y + 15) * rows / Number((await svgOf(ui)).match(/height="(\d+)"/)![1])
  await ui.pointer({ in: 'quran-card', type: 'down', button: 'left', x: 5, y: Math.floor(backY), fine: { x: 5, y: backY } })
  expect(await svgOf(ui)).not.toContain('class="list-page"')
})

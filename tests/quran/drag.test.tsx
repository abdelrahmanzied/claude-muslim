import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Mounted } from 'claude-code/testing'
import { PANE_HEIGHT, fieldTop, pickerInitial, pickerScrollbar, paneModel } from '../../src/features/quran/pane.ts'
import { fixtureCatalog } from './fixtures/catalog.ts'

const pane = (surface: 'desktop' | 'terminal') => ({ plugin: 'muslim', component: 'Pane' as const, requestId: 'quran', surface, props: { title: 'القرآن الكريم', isFocused: false, bodyColumns: 50, placement: 'inline' as const, scroll: { offset: 0, bodyRows: 20 }, view: {} } })
type Ui = Mounted<'desktop' | 'terminal', 'Pane'>
const reciters = Array.from({ length: 155 }, (_, i) => ({ ...fixtureCatalog.reciters[0]!, key: `${i + 1}:20`, name: `Fixture reciter ${i + 1}`, label: `Fixture reciter ${i + 1}` }))
function setup(on: On) {
  mock.env(on, { TERM_PROGRAM: 'WarpTerminal' })
  const store: Record<string, unknown> = { 'quran.catalog': { ...fixtureCatalog, reciters }, 'quran.reciter': '1:20' }
  on('store.get', async (_$, e) => ({ value: store[e.key] }))
  on('store.set', async (_$, e) => { store[e.key] = e.value; return { value: undefined } })
  mock.clock(on, { now: fixtureCatalog.fetchedAt })
  on('session.surface', async () => ({ value: 'desktop' as const }))
  on('ui.open', async () => ({ value: { isPlaced: true } }))
  on('ui.toast', async () => ({ value: undefined }))
}
const model = paneModel({ ...fixtureCatalog, reciters }, reciters[0]!, 1, null, 0, 420, 0, 0, false, null)
const bar = pickerScrollbar({ ...pickerInitial(model), open: 'reciter' }, reciters.length)!
// Host events in a region of 50 columns and `rows` rows: whole cells, plus the sub-cell position where the host knows it.
async function send(ui: Ui, type: 'down' | 'move' | 'up', px: number, py: number, rows: number, fine: boolean) {
  const x = px * 50 / 420, y = py * rows / PANE_HEIGHT
  await ui.pointer({ in: 'quran-card', type, ...(type === 'move' ? {} : { button: 'left' as const }), x: Math.floor(x), y: Math.floor(y), ...(fine ? { fine: { x, y } } : {}) })
}
const scrollOf = async (ui: Ui) => Number(String((await ui.find({ in: 'quran-card', type: 'Svg' }))?.props.source).match(/aria-valuenow="(\d+)"/)?.[1] ?? NaN)

test('dragging the scrollbar follows the pointer monotonically and rests when the pointer rests', async ($, on) => {
  setup(on)
  for (const cell of [17, 20, 23.5]) for (const fine of [true, false]) {
    const ui = await $.ui.mount(pane('desktop'))
    const rows = Math.ceil(PANE_HEIGHT / cell)
    await ui.resize({ columns: 50, rows, in: 'quran-card' })
    await send(ui, 'down', 210, fieldTop('reciter') + 20, rows, fine)
    await send(ui, 'down', 28, bar.thumbTop + bar.thumbHeight / 2, rows, fine)
    const seen: number[] = [await scrollOf(ui)]
    for (let y = bar.thumbTop + bar.thumbHeight / 2; y <= bar.top + bar.height; y += 1.5) {
      await send(ui, 'move', 28, y, rows, fine)
      seen.push(await scrollOf(ui))
    }
    const again = await scrollOf(ui)
    await send(ui, 'move', 28, bar.top + bar.height, rows, fine)
    expect(await scrollOf(ui)).toBe(again)
    await send(ui, 'up', 28, bar.top + bar.height, rows, fine)
    const back = seen.filter((v, i) => i > 0 && v < seen[i - 1]!)
    expect(back).toEqual([])
    await ui.unmount()
  }
})

// The host lays the region out in whole rows, and the row count it reports can flicker by one while the picture is swapped; the pointer must not follow it.
test('a row count that flickers during a drag does not shake the list', async ($, on) => {
  setup(on)
  const cell = PANE_HEIGHT / 43
  const ui = await $.ui.mount(pane('desktop'))
  await ui.resize({ columns: 50, rows: 43, in: 'quran-card' })
  const at = async (type: 'down' | 'move' | 'up', py: number) => ui.pointer({ in: 'quran-card', type, ...(type === 'move' ? {} : { button: 'left' as const }), x: 3, y: Math.floor(py / cell), fine: { x: 3.5, y: py / cell } })
  await at('down', fieldTop('reciter') + 20)
  await ui.pointer({ in: 'quran-card', type: 'down', button: 'left', x: 3, y: Math.floor((bar.thumbTop + 10) / cell), fine: { x: 3.5, y: (bar.thumbTop + 10) / cell } })
  const seen: number[] = []
  let flip = false
  for (let y = bar.thumbTop + 10; y <= bar.top + bar.height - 20; y += 2) {
    flip = !flip
    await ui.resize({ columns: 50, rows: flip ? 44 : 43, in: 'quran-card' })
    await at('move', y)
    seen.push(await scrollOf(ui))
  }
  expect(seen.filter((v, i) => i > 0 && v < seen[i - 1]!)).toEqual([])
  const steady = Math.round((bar.top + bar.height - 20 - 10 - bar.thumbTop) / (bar.height - bar.thumbHeight) * (reciters.length - 8))
  expect(Math.abs(seen.at(-1)! - steady)).toBeLessThanOrEqual(Math.ceil(2 * (reciters.length - 8) * cell / (bar.height - bar.thumbHeight)))
  await at('up', bar.top + bar.height)
  await ui.unmount()
})

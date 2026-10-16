import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Mounted } from 'claude-code/testing'
import { LIST_BACK, LIST_ROWS_TOP, fieldTop } from '../../src/features/quran/pane.ts'
import { fixtureCatalog } from './fixtures/catalog.ts'

type Ui = Mounted<'desktop', 'Pane'>
const pane = { plugin: 'muslim', component: 'Pane' as const, requestId: 'quran', surface: 'desktop' as const, props: { title: 'القرآن الكريم', isFocused: true, bodyColumns: 50, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 34 }, view: {} } }
const reciters = Array.from({ length: 220 }, (_, i) => ({ ...fixtureCatalog.reciters[0]!, key: `${i + 1}:20`, label: `Fixture reciter ${i + 1}` }))
function setup(on: On) {
  mock.env(on, {})
  const store: Record<string, unknown> = { 'quran.catalog': { ...fixtureCatalog, reciters }, 'quran.reciter': '1:20' }
  on('store.get', async (_$, e) => ({ value: store[e.key] }))
  on('store.set', async (_$, e) => { store[e.key] = e.value; return { value: undefined } })
  const clock = mock.clock(on, { now: fixtureCatalog.fetchedAt })
  on('session.surface', async () => ({ value: 'desktop' as const }))
  on('ui.open', async () => ({ value: { isPlaced: true } }))
  on('ui.toast', async () => ({ value: undefined }))
  on('ui.focus', async () => ({}))
  // The kit has no target-resolution implementation for $.ui.scroll(args).
  // The production best-effort reveal must not block picks when it is absent.
  return { store, clock }
}
const svgOf = async (ui: Ui) => (await ui.find({ in: 'quran-card', type: 'Svg' }))!.props
const sourceOf = async (ui: Ui) => String((await svgOf(ui)).source)
async function click(ui: Ui, px: number, py: number, fine = true) {
  const source = await sourceOf(ui)
  const height = Number(source.match(/height="(\d+)"/)![1])
  const rows = Math.ceil(height / 19)
  await ui.resize({ in: 'quran-card', columns: 50, rows })
  const x = px * 50 / 420, y = py * rows / height
  await ui.pointer({ in: 'quran-card', type: 'down', button: 'left', x: Math.floor(x), y: Math.floor(y), ...(fine ? { fine: { x, y } } : {}) })
}

test('a reciter list longer than one Svg pages with «التالي», and a row on the last page picks and returns', async ($, on) => {
  const { store } = setup(on)
  const ui = await $.ui.mount(pane)
  await click(ui, 210, fieldTop('reciter') + 20)
  const svg = await svgOf(ui), source = String(svg.source)
  expect(source).toContain('اختيار القارئ')
  expect(source).toContain('aria-label="التالي"')
  const shown = source.match(/role="option"/g)!.length
  expect(shown).toBeLessThan(220)
  expect(svg.height).toBeLessThanOrEqual(4096)
  await click(ui, 210, LIST_ROWS_TOP + shown * 24 + 12, false)
  const second = await sourceOf(ui)
  expect(second).toContain('aria-label="السابق"')
  expect(second).toContain('Fixture reciter 220')
  const rest = second.match(/role="option"/g)!.length
  expect(shown + rest).toBe(220)
  await click(ui, 210, LIST_ROWS_TOP + rest * 24 + 12, false)
  expect(store['quran.reciter']).toBe('220:20')
  expect(await sourceOf(ui)).not.toContain('class="list-page"')
})

test('our search filters the full page and back, Tab and host focus loss restore the identical closed card', async ($, on) => {
  const { store, clock } = setup(on)
  const ui = await $.ui.mount(pane)
  await ui.resize({ in: 'quran-card', columns: 50, rows: 40 })
  const card = await sourceOf(ui)
  for (const dismiss of ['back', 'tab', 'focus'] as const) {
    await click(ui, 210, fieldTop('surah') + 20)
    expect(await sourceOf(ui)).toContain('اختيار السورة')
    for (const key of '١٨') await ui.key({ in: 'quran-card', key })
    const filtered = await sourceOf(ui)
    expect(filtered).toContain('الكهف')
    expect(filtered.match(/role="option"/g)).toHaveLength(1)
    expect(filtered).not.toContain('الفاتحة')
    await ui.key({ in: 'quran-card', key: 'backspace' })
    expect(await sourceOf(ui)).toContain('الفاتحة')
    if (dismiss === 'back') await click(ui, LIST_BACK.x + 20, LIST_BACK.y + 15)
    else if (dismiss === 'tab') await ui.key({ in: 'quran-card', key: 'tab' })
    else await $.ui.focus({ component: 'Pane', requestId: 'quran', origin: { kind: 'person' } })
    expect(await sourceOf(ui)).toBe(card)
    expect(store['quran.reciter']).toBe('1:20')
  }
  await clock.advance(1000)
  expect(await sourceOf(ui)).toBe(card)
})

test('an unavailable target-scroll resolver never prevents picking or returning', async ($, on) => {
  const { store } = setup(on)
  const ui = await $.ui.mount(pane)
  await click(ui, 210, fieldTop('reciter') + 20)
  await ui.key({ in: 'quran-card', key: '2' })
  await ui.key({ in: 'quran-card', key: 'return' })
  expect(store['quran.reciter']).toBe('2:20')
  expect(await sourceOf(ui)).not.toContain('class="list-page"')
  await click(ui, 210, fieldTop('reciter') + 20)
  await click(ui, LIST_BACK.x + 20, LIST_BACK.y + 15)
  expect(await sourceOf(ui)).not.toContain('class="list-page"')
})

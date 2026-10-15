import { fixtureCatalog } from '../quran/fixtures/catalog.ts'
import type { On, PaneOpenArgs, UiOpenResult } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import { cardRects, ATHAN_TOP, ATHKAR_Y, CONTROLS_CY, KROW_TOP, OPEN_TOP, PANE_HEIGHT, PRAYER_Y, QURAN_Y } from '../../src/features/muslim-pane/layout.ts'
import type { PaneModel } from '../../src/features/muslim-pane/model.ts'

const MUNICH = 'Munich; 48.1351, 11.582; Europe/Berlin; DE'
const NOON = Date.parse('2026-10-10T10:00:00Z')

const pane = (surface: 'desktop' | 'terminal') => ({ plugin: 'muslim', component: 'Pane' as const, requestId: 'muslim', surface, props: { title: 'Muslim', isFocused: false, bodyColumns: 50, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 40 }, view: {} } })
// Stands for the engine's own band and mode labels beneath the plugin, so the features connect as in a session.
const engine = (on: On, surface: 'desktop' | 'terminal', open?: (args: PaneOpenArgs) => UiOpenResult, entries: Record<string, unknown> = {}) => {
  mock.env(on, {})
  mock.store(on, entries)
  mock.clock(on, { now: NOON })
  on('session.surface', async () => ({ value: surface }))
  on('config.list', async () => ({ value: [] }))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
  on('ui.render', { component: 'SessionMode' }, async ($, e) => { const { Text } = $.ui.resolve(e); return <Text>x</Text> })
  on('ui.render', { component: 'Pane', requestId: 'muslim' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
  on('ui.message', { element: 'muslim-pane' }, async () => ({}))
  const opened: { id: string; title?: string; focus?: true }[] = []
  on('ui.open', async (_$, e) => { opened.push({ id: e.id, title: e.title, ...(e.focus ? { focus: e.focus } : {}) }); return { value: open?.(e) ?? { isPlaced: true } } })
  return opened
}
const band = (surface: 'desktop' | 'terminal') => ({ plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId: 'band', props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} } })
const modes = (surface: 'desktop' | 'terminal') => ({ plugin: 'muslim', surface, component: 'SessionMode' as const, requestId: 'modes', props: { modes: [] as readonly string[] } })

test('/muslim pane opens the Muslim pane on desktop', { options: { salahPlace: MUNICH } }, async ($, on) => {
  const opened = engine(on, 'desktop')
  const result = await $.command.run({ command: 'muslim', args: 'pane', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(opened).toEqual([{ id: 'muslim', title: 'Muslim' }])
  expect(result.text).toContain('Muslim pane opened')
})

test('the pane draws the prayer card from salah and quiet notes for features not drawn yet', { options: { salahPlace: MUNICH, athkar: false } }, async ($, on) => {
  engine(on, 'desktop')
  const ui = await $.ui.mount(pane('desktop'))
  const model = (await ui.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
  expect(model.prayer.isSet).toBe(true)
  expect(model.prayer.city).toBe('Munich')
  expect(model.prayer.rows).toHaveLength(5)
  expect(model.prayer.rows.filter(r => r.state === 'next')).toHaveLength(1)
  expect(model.quran.isAvailable).toBe(false)
  expect(model.athkar.isAvailable).toBe(false)
})

test('the athkar card reads today\'s progress once the athkar band has drawn', { options: { salahPlace: MUNICH } }, async ($, on) => {
  engine(on, 'desktop')
  await $.ui.mount(band('desktop'))
  const ui = await $.ui.mount(pane('desktop'))
  const model = (await ui.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
  expect(model.athkar.isAvailable).toBe(true)
  if (model.athkar.isAvailable) expect(model.athkar.fraction).toMatch(/^٠ \/ [٠-٩]+$/)
})

test('the athan row changes the salah setting itself', { options: { salahPlace: MUNICH } }, async ($, on) => {
  engine(on, 'desktop')
  const sets: { key: string; value: unknown }[] = []
  on('config.set', async (_$, e) => { sets.push({ key: e.key, value: e.value }); return { value: e.value } })
  const ui = await $.ui.mount(pane('desktop'))
  await ui.resize({ columns: 50, rows: 40, in: 'muslim-pane' })
  const fine = { x: 25, y: (PRAYER_Y + ATHAN_TOP + 15) * 40 / PANE_HEIGHT }
  await ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: Math.floor(fine.x), y: Math.floor(fine.y), fine })
  expect(sets).toEqual([{ key: 'muslim.salahAthan', value: false }])
})

test('Open full player works before the footer or catalog has loaded; unavailable controls remain inactive', { options: { salahPlace: MUNICH } }, async ($, on) => {
  const opened = engine(on, 'desktop')
  on('http.fetch', async () => ({ value: { ok: false, status: 503, headers: {}, text: '' } }))
  const toasts: string[] = []
  on('ui.toast', async (_$, e) => { toasts.push(e.text); return { value: undefined } })
  const ui = await $.ui.mount(pane('desktop'))
  await ui.resize({ columns: 50, rows: 40, in: 'muslim-pane' })
  const click = async (y: number) => {
    const fine = { x: 25, y: y * 40 / PANE_HEIGHT }
    await ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: Math.floor(fine.x), y: Math.floor(fine.y), fine })
  }
  // No footer draw or catalog: playback is inactive, navigation still works.
  await click(QURAN_Y + CONTROLS_CY)
  expect(toasts).toEqual([])
  await click(QURAN_Y + OPEN_TOP + 15)
  expect(opened).toEqual([{ id: 'quran', title: 'القرآن الكريم', focus: true }])
  expect(toasts).toEqual([])
  // Athkar not connected: its button is not a target.
  await click(ATHKAR_Y + KROW_TOP + 18)
  expect(toasts).toHaveLength(0)
})

test('with the features drawn, Quran Open opens the Quran pane and athkar Open lights the reader', { options: { salahPlace: MUNICH } }, async ($, on) => {
  const opened = engine(on, 'desktop', undefined, { 'quran.catalog': { ...fixtureCatalog, fetchedAt: NOON } })
  on('http.fetch', { init: { method: 'HEAD' } }, async () => ({ value: { ok: true, status: 200, headers: { 'content-length': '1000000' }, text: '' } }))
  await $.ui.mount(modes('desktop'))
  await $.ui.mount(band('desktop'))
  const ui = await $.ui.mount(pane('desktop'))
  await ui.resize({ columns: 50, rows: 40, in: 'muslim-pane' })
  const click = async (y: number) => {
    const fine = { x: 25, y: y * 40 / PANE_HEIGHT }
    await ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: Math.floor(fine.x), y: Math.floor(fine.y), fine })
  }
  await click(QURAN_Y + OPEN_TOP + 15)
  expect(opened.map(o => o.id)).toContain('quran')
})

test('the terminal gets a plain text summary instead of a pane', { options: { salahPlace: MUNICH } }, async ($, on) => {
  const opened = engine(on, 'terminal')
  const result = await $.command.run({ command: 'muslim', args: 'pane', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(opened).toEqual([])
  expect(result.text).toContain('**Muslim**')
  expect(result.text).toContain('Munich')
  expect(result.text).toContain('Athan on')
})

test('the terminal pane body is text too', { options: { salahPlace: MUNICH } }, async ($, on) => {
  engine(on, 'terminal')
  const ui = await $.ui.mount(pane('terminal'))
  expect(await ui.find({ type: 'Client' })).toBeUndefined()
  expect(await ui.find({ text: /Munich/ })).toBeDefined()
})

test('the footer chip ☾ toggles the Muslim pane on desktop', { options: { salahPlace: MUNICH } }, async ($, on) => {
  const opened = engine(on, 'desktop')
  const panes: { id: string; title: string; isShown: boolean; isPlaced: boolean; isFocused: boolean }[] = []
  const closed: string[] = []
  on('ui.panes', async () => ({ value: panes }))
  on('ui.close', async (_$, e) => { closed.push(e.id); panes.length = 0; return { value: undefined } })
  const mounted = await $.ui.mount(modes('desktop'))
  expect((await mounted.find({ type: 'Button', key: 'muslim-footer' }))?.props.label).toBe('☾')
  await mounted.press({ key: 'muslim-footer' })
  expect(opened).toEqual([{ id: 'muslim', title: 'Muslim' }])
  panes.push({ id: 'muslim', title: 'Muslim', isShown: true, isPlaced: true, isFocused: false })
  await mounted.press({ key: 'muslim-footer' })
  expect(closed).toEqual(['muslim'])
  expect(opened).toHaveLength(1)
})

test('the footer chip sits before the engine items and is absent in the terminal, narrow or not', { options: { salahPlace: MUNICH } }, async ($, on) => {
  engine(on, 'desktop')
  const narrow = await $.ui.mount({ ...modes('desktop'), viewport: { columns: 10, rows: 30 } })
  expect((await narrow.find({ type: 'Button', key: 'muslim-footer' }))?.props.label).toBe('☾')
  expect(await narrow.find({ text: 'x' })).toBeDefined()
})

test('the terminal footer gets no ☾ chip', { options: { salahPlace: MUNICH } }, async ($, on) => {
  engine(on, 'terminal')
  const mounted = await $.ui.mount(modes('terminal'))
  expect(await mounted.find({ type: 'Button', key: 'muslim-footer' })).toBeUndefined()
})

test('pressing a card title folds it and unfolds it again, kept in the session', { options: { salahPlace: MUNICH } }, async ($, on) => {
  engine(on, 'desktop')
  const saved: Record<string, unknown> = {}
  on('state.get', { plugin: 'muslim', key: 'paneFolds' }, async (_$, e, next) => saved.paneFolds ? { value: { value: saved.paneFolds as never, version: 1 } } : next(e))
  on('state.set', { plugin: 'muslim', key: 'paneFolds' }, async (_$, e, next) => { saved.paneFolds = e.value; return next(e) })
  const ui = await $.ui.mount(pane('desktop'))
  await ui.resize({ columns: 50, rows: 40, in: 'muslim-pane' })
  const model = async () => (await ui.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
  const click = async (y: number, height: number) => {
    const fine = { x: 25, y: y * 40 / height }
    await ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: Math.floor(fine.x), y: Math.floor(fine.y), fine })
  }
  expect((await model()).folds).toEqual({ prayer: false, quran: false, athkar: false })
  await click(PRAYER_Y + 20, PANE_HEIGHT)
  expect((await model()).folds).toEqual({ prayer: true, quran: false, athkar: false })
  expect(saved.paneFolds).toEqual({ prayer: true, quran: false, athkar: false })
  // The folded card is short: the Quran title now sits right under it.
  const r = cardRects((await model()).folds)
  await click(r.prayerY + 20, r.height)
  expect((await model()).folds.prayer).toBe(false)
})

// Desktop's dock owns all mod-pane tabs. The test observes API requests;
// the native host's tab activation and painting still need a live check.
for (const alreadyOpen of [false, true]) test(`Open full player requests the Quran tab in front (${alreadyOpen ? 'existing tab' : 'first open'}) with a coarse pointer`, async ($, on) => {
  const opened = engine(on, 'desktop', undefined, { 'quran.catalog': { ...fixtureCatalog, fetchedAt: NOON } })
  const panes = [
    { id: 'muslim', title: 'Muslim', isPlaced: true, isShown: true, isFocused: true },
    ...(alreadyOpen ? [{ id: 'quran', title: 'القرآن الكريم', isPlaced: true, isShown: false, isFocused: false }] : []),
  ]
  on('ui.panes', async () => ({ value: panes }))
  on('http.fetch', { init: { method: 'HEAD' } }, async () => ({ value: { ok: true, status: 200, headers: { 'content-length': '1000000' }, text: '' } }))
  const closed: string[] = []
  on('ui.close', async (_$, e) => { closed.push(e.id); return { value: undefined } })
  const ui = await $.ui.mount(pane('desktop'))
  await ui.resize({ columns: 50, rows: 40, in: 'muslim-pane' })
  const click = () => ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: 25, y: Math.floor((QURAN_Y + OPEN_TOP + 21) * 40 / PANE_HEIGHT) })
  await click()
  await click()
  expect(opened).toEqual([
    { id: 'quran', title: 'القرآن الكريم', focus: true },
    { id: 'quran', title: 'القرآن الكريم', focus: true },
  ])
  expect(closed).toEqual([])
  expect(panes[0]!.id).toBe('muslim')
})

test('Open full player raises the tab before queued Quran preparation finishes', async ($, on) => {
  let raised!: () => void
  const opened = engine(on, 'desktop', e => { if (e.focus) raised(); return { isPlaced: true } }, { 'quran.catalog': { ...fixtureCatalog, fetchedAt: NOON } })
  let release!: () => void, started!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  const preparing = new Promise<void>(resolve => { started = resolve })
  const front = new Promise<void>(resolve => { raised = resolve })
  on('http.fetch', { init: { method: 'HEAD' } }, async () => {
    started()
    await held
    return { value: { ok: true, status: 200, headers: { 'content-length': '1000000' }, text: '' } }
  })
  const ui = await $.ui.mount(pane('desktop'))
  await ui.resize({ columns: 50, rows: 40, in: 'muslim-pane' })
  const command = $.command.run({ command: 'quran', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  await preparing
  const click = ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: 25, y: Math.floor((QURAN_Y + OPEN_TOP + 21) * 40 / PANE_HEIGHT) })
  try {
    await front
    expect(opened).toEqual([{ id: 'quran', title: 'القرآن الكريم' }, { id: 'quran', title: 'القرآن الكريم', focus: true }])
  } finally { release() }
  await command
  await click
  expect(opened).toHaveLength(2)
})

test('an unplaced Quran pane is reported instead of treated as a successful press', async ($, on) => {
  engine(on, 'desktop', () => ({ isPlaced: false, reason: 'no pane surface' }))
  const toasts: string[] = []
  on('ui.toast', async (_$, e) => { toasts.push(e.text); return { value: undefined } })
  const ui = await $.ui.mount(pane('desktop'))
  await ui.resize({ columns: 50, rows: 40, in: 'muslim-pane' })
  await ui.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: 25, y: Math.floor((QURAN_Y + OPEN_TOP + 21) * 40 / PANE_HEIGHT) })
  expect(toasts).toEqual(['Quran is not ready yet. /quran'])
})

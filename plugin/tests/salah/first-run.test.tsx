import { configRows } from '../fixtures/config.ts'
import type { EngineInterface, On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import { NO_ADJUST } from '../../src/features/salah/times.ts'
import { paneHeight, settingsBoxes } from '../../src/features/muslim-pane/layout.ts'
import type { PaneModel } from '../../src/features/muslim-pane/model.ts'
import { savePlace } from '../../src/features/salah/install.tsx'
import { readOptions } from '../../src/config.ts'

const NOW = Date.parse('2026-10-10T10:00:00Z')
const MUNICH = 'Munich; 48.1372, 11.5755; Europe/Berlin; DE'
const run = { command: 'salah', args: 'city 48.14, 11.58', origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } }
const band = {
  plugin: 'muslim', surface: 'desktop' as const, component: 'AbovePrompt' as const, requestId: 'save-first-run',
  props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} },
}
const engine = (on: On, entries: Record<string, unknown> = {}, rows = configRows) => {
  mock.env(on, {})
  const clock = mock.clock(on, { now: NOW })
  const saved = { ...entries }
  on('store.get', async (_$, e) => ({ value: saved[e.key] }))
  on('store.set', async (_$, e) => { saved[e.key] = e.value; return { value: undefined } })
  on('store.delete', async (_$, e) => { delete saved[e.key]; return { value: undefined } })
  on('config.list', async () => ({ value: rows }))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
  on('session.surface', async () => ({ value: 'desktop' }))
  const atoms: Record<string, unknown> = {}
  on('state.set', async (_$, e, next) => { const result = await next(e); if (result.value?.isSet) atoms[e.key] = e.value; return result })
  const toasts: string[] = []
  on('ui.toast', async (_$, e) => { toasts.push(e.text); return { value: undefined } })
  // Selecting Another city / Pick city resolves coordinates without a model call.
  on('tool.call', async (_$, e) => {
    const question = (e as unknown as { questions: { question: string }[] }).questions[0]?.question ?? ''
    return { tool: e.tool, tool_use_id: e.tool_use_id, result: { questions: [], answers: { [question]: '48.14, 11.58' } } } as never
  })
  return { saved, atoms, toasts, clock }
}

test('city save records the first answer and review before calling config.set', async ($, on) => {
  const { saved, atoms } = engine(on)
  let before: unknown
  on('config.set', async (_$, e) => {
    before = { from: saved['firstRun.remindFrom'], atom: atoms.firstRunRemindFrom, review: atoms.salahReview }
    return { value: e.value }
  })
  await $.command.run(run)
  expect(before).toEqual({ from: NOW, atom: NOW, review: NO_ADJUST })
})

// A throwing hook is skipped by the kit. With no config writer the API itself
// rejects; this exercises the real module's catch, rollback and UI/reply paths.
for (const failure of ['API rejection', 'deny'] as const) {
  for (const action of ['command', 'card', 'pane'] as const) {
    test(`${action}: ${failure} keeps the first answer, restores the review, reports the failure, and keeps setup visible`, async ($, on) => {
      const { saved, atoms, toasts } = engine(on)
      if (failure === 'deny') on('config.set', async () => ({ deny: 'locked' }))
      const expected = `Not changed: ${failure === 'deny' ? 'locked' : 'no implementation for config.set'}`
      if (action === 'pane') on('state.get', { plugin: 'muslim', key: 'paneSettings' }, async (_$, e, next) => {
        const actual = await next(e)
        return actual.value?.value ? actual : { value: { value: { open: true, category: 'prayer', face: 'main', page: 0 }, version: 0 } }
      })
      const ui = await $.ui.mount(band)
      if (action === 'command') expect((await $.command.run(run)).text).toBe(expected)
      else if (action === 'card') {
        // Yes where the host timezone supplies a guess; Pick city on UTC hosts.
        await ui.press({ key: await ui.find({ key: 'salah-yes' }) ? 'salah-yes' : 'salah-city' })
      } else {
        const pane = await $.ui.mount({ plugin: 'muslim', component: 'Pane', requestId: 'muslim', surface: 'desktop', props: { title: 'Muslim', isFocused: false, bodyColumns: 50, placement: 'dock', scroll: { offset: 0, bodyRows: 100 }, view: {} } })
        await pane.resize({ columns: 50, rows: 100, in: 'muslim-pane' })
        const model = (await pane.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel
        const target = settingsBoxes(420, model.folds, model.settings).find(t => t.act === 'settings:city')!
        const height = paneHeight(model.folds, model.settings.state, model.settings.options)
        const fine = { x: (target.x0 + target.x1) / 2 * 50 / 420, y: (target.y0 + target.y1) / 2 * 100 / height }
        await pane.pointer({ in: 'muslim-pane', type: 'down', button: 'left', x: Math.floor(fine.x), y: Math.floor(fine.y), fine })
        await pane.unmount()
      }
      if (action !== 'command') expect(toasts).toEqual([expected])
      expect(saved['firstRun.remindFrom']).toBe(NOW)
      expect(atoms.firstRunRemindFrom).toBe(NOW)
      expect(atoms.salahReview).toBe(null)
      expect(await ui.find({ key: 'salah-setup' })).toBeDefined()
      expect(await ui.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
      await ui.unmount()
    })
  }
}

// A small engine stub calls the actual same-file writer. No real $ handle
// crosses files. It supplies the native rejection the kit cannot inject.
const stub = (stored: Record<string, unknown>, atoms: Record<string, unknown>, rows: unknown, error: unknown) => {
  const seen: { atWrite?: unknown } = {}
  let listed = false
  const engine = {
    state: {
      get: async (ref: { key: string }) => ({ value: atoms[ref.key], version: 1 }),
      set: async (ref: { key: string }, value: unknown) => { atoms[ref.key] = value; return { isSet: true, version: 2 } },
    },
    store: {
      get: async (key: string) => stored[key],
      set: async (key: string, value: unknown) => { stored[key] = value },
      delete: async (key: string) => { delete stored[key] },
    },
    clock: { now: async () => NOW },
    config: {
      set: async () => { seen.atWrite = { timestamp: stored['firstRun.remindFrom'], review: atoms.salahReview }; throw error },
      list: async () => { if (!listed) { listed = true; return configRows } if (rows instanceof Error) throw rows; return rows },
    },
  } as unknown as EngineInterface
  return { engine, seen }
}
const CITY = { name: 'Munich', country: 'DE', latitude: 48.14, longitude: 11.58, timeZone: 'Europe/Berlin' }

test('the city writer catches missing-row and other thrown config errors, keeps the answer and restores the review', async () => {
  for (const [error, message] of [
    [new Error('no /config row with key muslim.salahPlace'), 'run /reload-plugins, then try again.'],
    [new Error('write failed'), 'write failed'],
    ['plain thrown message', 'plain thrown message'],
  ] as const) {
    for (const previous of [undefined, null, 'unreadable', NOW - 1000]) {
      const stored: Record<string, unknown> = previous === undefined ? {} : { 'firstRun.remindFrom': previous }
      const review = { ...NO_ADJUST, asr: 3 }
      const answer = typeof previous === 'number' ? previous : NOW
      const atoms: Record<string, unknown> = { salahReview: review, firstRunRemindFrom: typeof previous === 'number' ? previous : null }
      const { engine, seen } = stub(stored, atoms, [], error)
      const result = await savePlace(engine, CITY, readOptions({}))
      expect(result).toBe(`Not changed: ${message}`)
      expect(seen.atWrite).toEqual({ timestamp: answer, review: NO_ADJUST })
      expect(stored).toEqual({ 'firstRun.remindFrom': answer })
      expect(atoms).toEqual({ salahReview: review, firstRunRemindFrom: answer })
    }
  }
})

test('a late error after the city was saved, or with /config unreadable, is not undone', async () => {
  const saved = [{ key: 'muslim.salahPlace', value: 'Munich, Germany; 48.14, 11.58; Europe/Berlin; DE' }]
  for (const rows of [saved, new Error('module replaced')]) {
    const stored: Record<string, unknown> = {}
    const atoms: Record<string, unknown> = { salahReview: null, firstRunRemindFrom: null }
    const { engine } = stub(stored, atoms, rows, new Error('module replaced'))
    const city = rows instanceof Error ? CITY : { ...CITY, name: 'Munich, Germany' }
    const result = await savePlace(engine, city, readOptions({}))
    expect(result.startsWith('**City:**')).toBe(true)
    expect(stored['firstRun.remindFrom']).toBe(NOW)
    expect(atoms.salahReview).toEqual(NO_ADJUST)
  }
})

for (const [label, options, saved] of [
  ['recorded answer', { salahPlace: MUNICH }, { 'firstRun.remindFrom': NOW - 1000 }],
  ['legacy city', { salahPlace: MUNICH }, {}],
  ['legacy Not now', {}, { salahSetupLater: true }],
] as const) {
  test(`later city changes preserve the existing answer or legacy absence: ${label}`, { options }, async ($, on) => {
    const { saved: store, clock } = engine(on, saved)
    on('config.set', async (_$, e) => ({ value: e.value }))
    await clock.advance(1000)
    await $.command.run(run)
    expect(store['firstRun.remindFrom']).toBe('firstRun.remindFrom' in saved ? saved['firstRun.remindFrom'] : undefined)
  })
}

for (const failure of ['pending', 'deny', 'throw'] as const) test(`review Save clears before config completes: ${failure}`, { options: { salahPlace: MUNICH } }, async ($, on) => {
  const { atoms, toasts, clock } = engine(on)
  let started!: () => void
  const writing = new Promise<void>(resolve => { started = resolve })
  on('config.set', async () => {
    expect(atoms.salahReview).toBe(null)
    started()
    if (failure === 'pending') await new Promise<void>(() => {})
    if (failure === 'throw') throw new Error('locked')
    return { deny: 'locked' }
  })
  await $.command.run({ ...run, args: 'adjust' })
  const ui = await $.ui.mount(band)
  void ui.press({ key: 'salah-save' })
  await writing
  if (failure === 'pending') expect(atoms.salahReview).toBe(null)
  else {
    await clock.settle()
    expect(atoms.salahReview).toEqual(NO_ADJUST)
    expect(toasts).toHaveLength(1)
    expect(toasts[0]).toMatch(/^Not changed:/)
    if (failure === 'deny') expect(toasts[0]).toBe('Not changed: locked')
  }
  await ui.unmount()
})

test('missing city row changes no setup answer or review state', async () => {
  const stored: Record<string, unknown> = {}, atoms = { salahReview: null }
  const { engine, seen } = stub(stored, atoms, [], new Error('must not write'))
  engine.config.list = async () => []
  expect(await savePlace(engine, CITY, readOptions({}))).toBe('Not changed: run /reload-plugins, then try again.')
  expect(seen.atWrite).toBeUndefined()
  expect(stored).toEqual({})
  expect(atoms).toEqual({ salahReview: null })
})

test('missing review row leaves the draft open and shows the friendly toast', { options: { salahPlace: MUNICH } }, async ($, on) => {
  const { atoms, toasts } = engine(on, {}, [])
  const writes: unknown[] = []
  on('config.set', async (_$, e) => { writes.push(e); return { value: e.value } })
  await $.command.run({ ...run, args: 'adjust' })
  const ui = await $.ui.mount(band)
  await ui.press({ key: 'salah-save' })
  expect(atoms.salahReview).toEqual(NO_ADJUST)
  expect(await ui.find({ key: 'salah-save' })).toBeDefined()
  expect(writes).toEqual([])
  expect(toasts).toEqual(['Not changed: run /reload-plugins, then try again.'])
  await ui.unmount()
})

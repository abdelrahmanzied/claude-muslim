import type { On } from 'claude-code'
import { expect, mock, test, type Mounted } from 'claude-code/testing'
import { DEMO_DURATION_MS, DEMO_FOLD_MS, DEMO_UNFOLD_MS, demoReply, demoTerminalReply } from '../../src/features/muslim-pane/demo.ts'
import { DEMO_GAP_MS, DEMO_START_MS } from '../../src/demo.ts'
import { demoDuration as athkarDuration } from '../../src/features/athkar/demo.ts'
import { demoDuration as salahDuration } from '../../src/features/salah/demo.ts'
import { demoPrompt, DEMO_LIMIT_MS, DEMO_SUBMIT_MS } from '../../src/features/thikr/demo.ts'
import type { Engine } from 'claude-code/testing'
import type { PaneModel } from '../../src/features/muslim-pane/model.ts'

const NOON = Date.parse('2026-10-10T10:00:00Z')
const run = (args: string) => ({ command: 'muslim', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })
const pane = (surface: 'desktop' | 'terminal') => ({ plugin: 'muslim', component: 'Pane' as const, requestId: 'muslim', surface, props: { title: 'Muslim', isFocused: false, bodyColumns: 50, placement: 'dock' as const, scroll: { offset: 0, bodyRows: 40 }, view: {} } })

const fixture = (on: On, surface: 'desktop' | 'terminal', startsOpen: boolean) => {
  mock.env(on, {})
  const clock = mock.clock(on, { now: NOON })
  const writes: string[] = []
  const calls: string[] = []
  let open = startsOpen
  on('session.surface', async () => ({ value: surface }))
  on('prompt.submit', async (_$, e) => ({ text: e.text }))
  on('turn.start', async (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', async (_$, e) => ({ text: e.answer }))
  on('config.list', async () => ({ value: [] }))
  on('store.get', async (_$, e) => ({ value: e.key === 'arabicTerminals' ? { unknown: 'plain' } : undefined }))
  on('store.set', async (_$, e) => (writes.push(`store:${e.key}`), { value: undefined }))
  on('config.set', async (_$, e) => (writes.push(`config:${e.key}`), { value: e.value }))
  on('state.set', async (_$, e, next) => (writes.push(`state:${e.key}`), next(e)))
  on('ui.panes', async () => ({ value: open ? [{ id: 'muslim' }] : [] }) as never)
  on('ui.open', async (_$, e) => { calls.push('open'); open = true; return { value: { isPlaced: true } } })
  on('ui.close', async (_$, e) => { calls.push('close'); open = false; return { value: undefined } as never })
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => { const { Box } = $.ui.resolve(e); return <Box /> })
  on('ui.render', { component: 'SessionMode' }, async ($, e) => { const { Text } = $.ui.resolve(e); return <Text>x</Text> })
  return { clock, writes, calls }
}
const modelOf = async (ui: Pick<Mounted<'desktop' | 'terminal', 'Pane'>, 'find'>) => (await ui.find({ type: 'Client', key: 'muslim-pane' }))!.props.props as PaneModel

// Drive the real shared sequence; `/muslim demo pane` plays the same tour alone.
const startTour = async ($: Engine, clock: ReturnType<typeof mock.clock>, surface: 'desktop' | 'terminal') => {
  await $.command.run(run('demo'))
  await clock.advance(DEMO_START_MS + DEMO_SUBMIT_MS)
  await $.turn.start({ text: demoPrompt('/muslim demo'), turnId: 'tour-turn' })
  await $.turn.complete({ answer: 'Done.', durationMs: 1000, isAborted: false, reason: 'answer', turnId: 'tour-turn' })
  await clock.settle()
  await clock.advance(DEMO_LIMIT_MS)
  await clock.advance(DEMO_GAP_MS + athkarDuration(surface === 'desktop' ? 'sky' : 'frame', 3200))
  await clock.advance(DEMO_GAP_MS + salahDuration(surface))
  await clock.advance(athkarDuration('frame', 3200, 'afterSalah'))
  await clock.advance(DEMO_GAP_MS)
}

test('the shared pane step skips a terminal without opening a pane', {options:{thikr:false,athkar:false,salahShow:'off',salahAthan:false}}, async ($, on) => {
  const { clock, calls, writes } = fixture(on, 'terminal', false)
  await startTour($, clock, 'terminal')
  await clock.advance(DEMO_DURATION_MS)
  expect(calls).toEqual([])
  expect(writes).toEqual([])
})

for (const startsOpen of [false, true]) {
  test(`desktop, pane ${startsOpen ? 'open' : 'closed'}: the tour unfolds, plays, folds back and restores the pane without saved writes`, {options:{thikr:false,athkar:false,salahShow:'off',salahAthan:false}, timeoutMs: 20000 }, async ($, on) => {
    const { clock, calls, writes } = fixture(on, 'desktop', startsOpen)
    const ui = await $.ui.mount(pane('desktop'))
    await clock.settle()
    writes.length = 0
    await startTour($, clock, 'desktop')
    expect(calls).toEqual(startsOpen ? [] : ['open'])
    const m0 = await modelOf(ui)
    expect(m0.folds).toEqual({ prayer: true, quran: true, athkar: true })
    expect(m0.settings.state.open).toBe(false)
    await clock.advance(DEMO_UNFOLD_MS.athkar + 100)
    const m1 = await modelOf(ui)
    expect(m1.folds).toEqual({ prayer: false, quran: false, athkar: false })
    expect(m1.prayer.nextName).toBe('الفجر')
    expect(m1.prayer.nextTime).toBe('٠٥:٠٠')
    expect(m1.quran.isAvailable && m1.quran.status).toBe('يتلى الآن')
    await clock.advance(DEMO_FOLD_MS.athkar - DEMO_UNFOLD_MS.athkar - 100 - 200)
    const m2 = await modelOf(ui)
    expect(m2.athkar.isAvailable && m2.athkar.isDone).toBe(true)
    await clock.advance(DEMO_DURATION_MS - DEMO_FOLD_MS.athkar + 200)
    expect(calls).toEqual(startsOpen ? [] : ['open', 'close'])
    expect(writes).toEqual([])
    await ui.unmount()
  })
}

test('/muslim demo pane on a terminal says desktop only, and nothing starts', async ($, on) => {
  const { clock, calls, writes } = fixture(on, 'terminal', false)
  expect((await $.command.run(run('demo pane'))).text).toBe(demoTerminalReply())
  await clock.advance(DEMO_DURATION_MS)
  expect(calls).toEqual([])
  expect(writes).toEqual([])
})

test('/muslim demo pane on desktop plays the tour alone and closes the pane it opened, without saved writes', async ($, on) => {
  const { clock, calls, writes } = fixture(on, 'desktop', false)
  const ui = await $.ui.mount(pane('desktop'))
  await clock.settle()
  writes.length = 0
  expect((await $.command.run(run('demo pane'))).text).toBe(demoReply())
  expect(calls).toEqual(['open'])
  await clock.advance(DEMO_UNFOLD_MS.athkar + 100)
  expect((await modelOf(ui)).folds).toEqual({ prayer: false, quran: false, athkar: false })
  await clock.advance(DEMO_DURATION_MS)
  expect(calls).toEqual(['open', 'close'])
  expect(writes).toEqual([])
  await ui.unmount()
})

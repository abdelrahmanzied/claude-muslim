import type { On } from 'claude-code'
import { expect, mock, test, type Mounted } from 'claude-code/testing'
import { DEMO_DURATION_MS, DEMO_FOLD_MS, DEMO_UNFOLD_MS, demoReply, demoTerminalReply } from '../../src/features/muslim-pane/demo.ts'
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

test('a terminal is told the pane demo is desktop only, and nothing starts', async ($, on) => {
  const { clock, calls, writes } = fixture(on, 'terminal', false)
  expect((await $.command.run(run('pane demo'))).text).toBe(demoTerminalReply())
  await clock.advance(DEMO_DURATION_MS)
  expect(calls).toEqual([])
  expect(writes).toEqual([])
})

for (const startsOpen of [false, true]) {
  test(`desktop, pane ${startsOpen ? 'open' : 'closed'}: the tour unfolds, plays, folds back and restores the pane without saved writes`, async ($, on) => {
    const { clock, calls, writes } = fixture(on, 'desktop', startsOpen)
    const ui = await $.ui.mount(pane('desktop'))
    await clock.settle()
    writes.length = 0
    expect((await $.command.run(run('pane demo'))).text).toBe(demoReply())
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

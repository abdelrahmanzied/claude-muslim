import type { On } from 'claude-code'
import { expect, mock, test, type Engine } from 'claude-code/testing'

import { DEMO_GAP_MS, DEMO_START_MS, demoReply, demoTiming } from '../../src/demo.ts'
import { demoPrompt, DEMO_LIMIT_MS, DEMO_SUBMIT_MS } from '../../src/features/thikr/demo.ts'
import { USAGE_LIMIT } from '../../src/features/thikr/phrases.ts'
import { stripTashkeel } from '../../src/shared/arabic/visual.ts'

const NOW = Date.parse('2026-10-10T10:00:00Z')
const OPTIONS = { thikr: false, athkar: false, salahShow: 'off', salahAthan: false }
const run = (args = 'demo') => ({ command: 'muslim', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })
const band = (surface: 'desktop' | 'terminal') => ({
  plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId: 'muslim-demo',
  props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} },
})

const fixture = (on: On, surface: 'desktop' | 'terminal' = 'desktop', submit: 'accept' | 'drop' | 'throw' = 'accept') => {
  mock.env(on, {})
  const clock = mock.clock(on, { now: NOW })
  const written: { key: string; value: unknown }[] = []
  const submitted: string[] = []
  on('session.surface', async () => ({ value: surface }))
  on('config.list', async () => ({ value: [] }))
  on('store.get', async (_$, e) => ({ value: e.key === 'arabicTerminals' ? { unknown: 'plain' } : undefined }))
  on('store.set', async (_$, e) => (written.push(e), { value: undefined }))
  on('store.delete', async (_$, e) => (written.push({ key: e.key, value: undefined }), { value: undefined }))
  on('config.set', async (_$, e) => (written.push(e), { value: e.value }))
  on('state.set', async (_$, e, next) => (written.push(e), next(e)))
  on('prompt.submit', async (_$, e) => {
    submitted.push(e.text)
    if (submit === 'throw') throw new Error('submit failed')
    return submit === 'drop' ? { drop: 'not now' } : { text: e.text }
  })
  on('turn.start', async (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', async (_$, e) => ({ text: e.answer }))
  on('fs.read', async () => ({ value: { base64: 'QUJD' } }))
  on('ui.render', { component: 'Spinner' }, async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{e.props.word}</Text>
  })
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })

  return { clock, written, submitted }
}

// Claude Code appends a note to a prompt a plugin submits, so the turn's text is not the prompt.
const HOST_PROMPT = `${demoPrompt()}\n\nThis is how Claude Code surfaces a prompt a plugin submits between turns.`

const complete = ($: Engine, turnId: string, reason: 'answer' | 'aborted' | 'error' = 'answer', agentId?: string) =>
  $.turn.complete({ answer: 'Thikr demo done.', durationMs: 30_000, isAborted: reason === 'aborted', reason, turnId, ...(agentId ? { agentId } : {}) })

for (const [surface, style] of [['desktop', 'sky'], ['terminal', 'sky'], ['desktop', 'frame']] as const) {
  test(`${surface} ${style}: thikr, then athkar, then salah; no demo bands overlap`, { options: { ...OPTIONS, athkarStyle: style } }, async ($, on) => {
    const { clock, submitted, written } = fixture(on, surface)
    const ui = await $.ui.mount(band(surface))
    const limit = () => ui.find({ type: 'Text', text: surface === 'terminal' ? stripTashkeel(USAGE_LIMIT) : USAGE_LIMIT })
    const salah = () => surface === 'desktop'
      ? ui.find({ key: 'salah-athan' })
      : ui.find({ type: 'Text', text: /حان وقت صلاة|▐███▌/ })
    const timing = demoTiming(surface, style)
    expect((await $.command.run(run())).text).toBe(demoReply())
    await clock.advance(DEMO_START_MS)
    expect(submitted).toEqual([])
    await clock.advance(DEMO_SUBMIT_MS)
    expect(submitted).toEqual([demoPrompt()])
    await $.turn.start({ text: HOST_PROMPT, turnId: 'demo-turn' })

    const spinner = await $.ui.render({ surface, component: 'Spinner', requestId: 'spinner', props: { word: 'Working', message: null, suffix: '', mode: 'thinking' } })
    expect(JSON.stringify(spinner)).toContain('الل')

    // A real turn may take arbitrarily long; wall-clock guesses must not
    // start athkar while Claude is still working.
    await clock.advance(60_000)
    expect(await ui.find({ key: 'athkar-demo' })).toBeUndefined()
    expect(await salah()).toBeUndefined()
    await complete($, 'demo-turn')
    await clock.settle()
    expect(await limit(), 'thikr usage-limit hold after its turn').toBeDefined()
    expect(await ui.find({ key: 'athkar-demo' })).toBeUndefined()
    expect(await salah()).toBeUndefined()
    await clock.advance(DEMO_LIMIT_MS)
    expect(await limit()).toBeUndefined()
    await clock.advance(DEMO_GAP_MS - 1)
    expect(await ui.find({ key: 'athkar-demo' })).toBeUndefined()
    expect(await salah()).toBeUndefined()
    await clock.advance(1)
    expect(await ui.find({ key: 'athkar-demo' }), 'athkar after the thikr hold and gap').toBeDefined()
    expect(await limit()).toBeUndefined()
    expect(await salah()).toBeUndefined()
    await clock.advance(timing.athkarMs)
    expect(await ui.find({ key: 'athkar-demo' })).toBeUndefined()
    await clock.advance(DEMO_GAP_MS - 1)
    expect(await ui.find({ key: 'athkar-demo' })).toBeUndefined()
    expect(await salah()).toBeUndefined()
    await clock.advance(1)
    expect(await ui.find({ key: 'athkar-demo' })).toBeUndefined()
    expect(await salah(), 'salah after the athkar duration and gap').toBeDefined()
    expect(await limit()).toBeUndefined()
    const isFolded = async () => surface === 'desktop'
      ? ((await ui.find({ key: 'salah-athan' }))?.props.props as { isFolded: boolean }).isFolded
      : (await ui.find({ text: '▐███▌' })) === undefined
    const openMs = timing.salahMs - 3000
    await clock.advance(openMs - 1)
    expect(await isFolded()).toBe(false)
    await clock.advance(1)
    expect(await isFolded()).toBe(true)
    await clock.advance(2999)
    expect(await salah(), 'salah stays folded for the full three seconds').toBeDefined()
    await clock.advance(1)
    expect(await salah()).toBeUndefined()
    expect(written).toEqual([])
    expect((await $.command.run(run())).text).toBe(demoReply())
    await ui.unmount()
  })
}

test('a repeat while queued, working, holding, reading or showing salah says already playing', { options: OPTIONS }, async ($, on) => {
  const { clock } = fixture(on)
  await $.command.run(run())
  const repeat = async () => expect((await $.command.run(run())).text).toBe('**Muslim demo:** already playing.')
  await repeat()
  await clock.advance(DEMO_START_MS + DEMO_SUBMIT_MS)
  await $.turn.start({ text: HOST_PROMPT, turnId: 't' })
  await repeat()
  await complete($, 't')
  await repeat()
  const timing = demoTiming('desktop', 'sky')
  await clock.advance(DEMO_LIMIT_MS + timing.afterThikrMs)
  await repeat()
  await clock.advance(timing.athkarMs + DEMO_GAP_MS)
  await repeat()
  await clock.advance(timing.salahMs)
  expect((await $.command.run(run())).text).toBe(demoReply())
})

for (const submit of ['drop', 'throw'] as const) {
  test(`a ${submit === 'drop' ? 'dropped' : 'failing'} prompt releases the shared runner without running later demos`, { options: OPTIONS }, async ($, on) => {
    const { clock, submitted } = fixture(on, 'desktop', submit)
    await $.command.run(run())
    await clock.advance(DEMO_START_MS + DEMO_SUBMIT_MS)
    await clock.advance(90_000)
    expect(submitted).toEqual([demoPrompt()])
    expect((await $.command.run(run())).text).toBe(demoReply())
  })
}

test('extra demo arguments show usage and start nothing', async ($, on) => {
  const { clock, written } = fixture(on)
  expect((await $.command.run(run('demo sky'))).text).toBe('Usage: /muslim demo')
  await clock.advance(90_000)
  expect(written).toEqual([])
})

test('unrelated and subagent completions do not advance the shared sequence', { options: OPTIONS }, async ($, on) => {
  const { clock } = fixture(on)
  const ui = await $.ui.mount(band('desktop'))
  await $.command.run(run())
  await clock.advance(DEMO_START_MS + DEMO_SUBMIT_MS)
  await $.turn.start({ text: HOST_PROMPT, turnId: 't' })
  await complete($, 'other')
  await complete($, 't', 'answer', 'subagent')
  await clock.advance(60_000)
  expect(await ui.find({ key: 'athkar-demo' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: USAGE_LIMIT })).toBeUndefined()
  await complete($, 't', 'aborted')
  expect(await ui.find({ type: 'Text', text: USAGE_LIMIT })).toBeDefined()
  await clock.advance(DEMO_LIMIT_MS + demoTiming('desktop', 'sky').afterThikrMs)
  expect(await ui.find({ key: 'athkar-demo' })).toBeDefined()
  await ui.unmount()
})

test('clearing the session cancels a queued shared demo', { options: OPTIONS }, async ($, on) => {
  const { clock, submitted } = fixture(on)
  on('session.end', async (_$, e) => ({ sessionId: e.sessionId }))
  await $.command.run(run())
  await $.session.end({ reason: 'clear', sessionId: 'test-session', resume: { id: 'test-session' } })
  await clock.advance(90_000)
  expect(submitted).toEqual([])
  expect((await $.command.run(run())).text).toBe(demoReply())
})

test('whitespace around demo still connects every real feature starter', { options: OPTIONS }, async ($, on) => {
  const { clock, submitted } = fixture(on)
  expect((await $.command.run(run('  demo  '))).text).toBe(demoReply())
  await clock.advance(DEMO_START_MS + DEMO_SUBMIT_MS)
  expect(submitted).toEqual([demoPrompt()])
})

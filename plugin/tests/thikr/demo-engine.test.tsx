import type { On } from 'claude-code'
import { expect, mock, test, type Engine } from 'claude-code/testing'

import { demoPrompt, demoReply, DEMO_LIMIT_MS, DEMO_STEP_MS, DEMO_SUBMIT_MS, demoScenes } from '../../src/features/thikr/demo.ts'
import { END_OF_TURN, SALAWAT, THINKING, USAGE_LIMIT } from '../../src/features/thikr/phrases.ts'
import { stripTashkeel } from '../../src/shared/arabic/visual.ts'

const run = (args: string) => ({ command: 'thikr', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })
const spinner = (surface: 'terminal' | 'desktop') => ({
  surface, component: 'Spinner' as const, requestId: 'main',
  props: { word: 'Sauteing', message: null, suffix: '…', mode: 'thinking' as const },
})
const turnDuration = { surface: 'terminal' as const, component: 'TurnDuration' as const, requestId: 'm1', props: { word: 'Baked', durationMs: 3000 } }
const band = {
  surface: 'terminal' as const, component: 'AbovePrompt' as const, requestId: 'band',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} },
}

// Stands for the engine beneath the plugins, recording every persistent write.
const engine = (on: On, submit: (text: string) => Promise<{ text: string; drop?: undefined } | { drop: string }> = async text => ({ text })) => {
  const now = 0
  const written: unknown[] = []
  const submitted: string[] = []
  mock.env(on, {})
  const clock = mock.clock(on, { now })
  on('store.get', async (_$, e) => ({ value: e.key === 'arabicTerminals' ? { unknown: 'plain' } : undefined }))
  on('store.set', async (_$, e) => (written.push(e), { value: undefined }))
  on('config.set', async (_$, e) => (written.push(e), { value: e.value }))
  on('state.set', async (_$, e, next) => (written.push(e), next(e)))
  on('prompt.submit', async (_$, e) => (submitted.push(e.text), submit(e.text)))
  on('turn.start', async (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', async (_$, e) => ({ text: e.answer }))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })

  return { clock, written, submitted }
}

const words: string[] = []
const recordSpinner = (on: On) => {
  words.length = 0
  on('ui.render', { component: 'Spinner' }, async ($, e) => {
    words.push(e.props.word)
    const { Text } = $.ui.resolve(e)

    return <Text>{e.props.word}</Text>
  })
}
const recordTurnDuration = (on: On, seen: string[]) =>
  on('ui.render', { component: 'TurnDuration' }, async ($, e) => {
    seen.push(e.props.word)
    const { Text } = $.ui.resolve(e)

    return <Text>{e.props.word}</Text>
  })
const complete = ($: Engine, turnId: string) =>
  $.turn.complete({ answer: 'ok', durationMs: 3000, isAborted: false, reason: 'answer', turnId } as never)
const hasLimit = async ($: Engine) => {
  const ui = await $.ui.mount({ plugin: 'muslim', ...band })
  const found = await ui.find({ type: 'Text', text: stripTashkeel(USAGE_LIMIT) })
  await ui.unmount()

  return found !== undefined
}

test('/thikr demo starts its own turn once, with the demo prompt, and the reply says so', async ($, on) => {
  const { clock, submitted } = engine(on)

  expect((await $.command.run(run('demo'))).text).toBe('**Thikr demo:** playing. Claude runs a few short steps (about 30 s).')
  // Not from inside the command: the host refuses that, so it goes just after the reply.
  expect(submitted).toEqual([])
  await clock.advance(DEMO_SUBMIT_MS)
  await clock.advance(60_000)
  expect(submitted).toEqual([demoPrompt()])
})

test('a dropped demo prompt disarms, so a later message does not play it', async ($, on) => {
  const { clock } = engine(on, async () => ({ drop: 'no' }))
  recordSpinner(on)
  await $.command.run(run('demo'))
  await clock.advance(DEMO_SUBMIT_MS)
  await $.turn.start({ text: 'later', turnId: 't' })
  await $.ui.render(spinner('terminal'))

  expect(words).toEqual([stripTashkeel(THINKING[0]!)])
})

test('a failing submit disarms too', async ($, on) => {
  const { clock } = engine(on, async () => { throw new Error('no') })
  recordSpinner(on)
  await $.command.run(run('demo'))
  await clock.advance(DEMO_SUBMIT_MS)
  await $.turn.start({ text: 'later', turnId: 't' })
  await $.ui.render(spinner('terminal'))

  expect(words).toEqual([stripTashkeel(THINKING[0]!)])
})

test('the demo turn plays every group in order, a phrase each 1.5 s', async ($, on) => {
  const { clock } = engine(on)
  recordSpinner(on)
  await $.command.run(run('demo'))
  await clock.advance(DEMO_SUBMIT_MS)
  await $.turn.start({ text: 'hi', turnId: 't' })

  const scenes = demoScenes()
  for (const [i, scene] of scenes.entries()) {
    await $.ui.render(spinner('terminal'))
    expect(words[i]).toBe(stripTashkeel(scene.text))
    await clock.advance(DEMO_STEP_MS)
  }
  // The last phrase holds if the turn runs on.
  await clock.advance(30_000)
  await $.ui.render(spinner('terminal'))
  expect(words[words.length - 1]).toBe(stripTashkeel(SALAWAT[0]!))
})

test('desktop plays the same phrases with tashkeel as authored', async ($, on) => {
  engine(on)
  recordSpinner(on)
  await $.command.run(run('demo'))
  await $.turn.start({ text: 'hi', turnId: 't' })
  await $.ui.render(spinner('desktop'))

  expect(words).toEqual([demoScenes()[0]!.text])
})

test('nothing plays before the demo turn starts', async ($, on) => {
  engine(on)
  recordSpinner(on)
  await $.command.run(run('demo'))
  await $.ui.render(spinner('terminal'))

  // Armed only: the feature's own thinking phrase, not the demo's first.
  expect(words).toEqual([stripTashkeel(THINKING[0]!)])
})

test('the end-of-turn word shows even with thikrEnd off, then the usage-limit line for 3 s, then the demo disarms', { options: { thikrEnd: false } }, async ($, on) => {
  const { clock } = engine(on)
  recordSpinner(on)
  const seen: string[] = []
  recordTurnDuration(on, seen)
  await $.command.run(run('demo'))
  await $.turn.start({ text: 'hi', turnId: 't' })
  await $.ui.render(spinner('terminal'))
  expect(await hasLimit($)).toBe(false)

  await complete($, 't')
  await $.ui.render(turnDuration)
  expect(seen).toEqual([stripTashkeel(END_OF_TURN)])
  expect(await hasLimit($)).toBe(true)
  await clock.advance(DEMO_LIMIT_MS - 1)
  expect(await hasLimit($)).toBe(true)
  await clock.advance(1)
  expect(await hasLimit($)).toBe(false)

  // Disarmed: Claude's own words are back, and the next turn does not replay it.
  await $.ui.render(turnDuration)
  expect(seen[1]).toBe('Baked')
  await $.turn.start({ text: 'again', turnId: 't2' })
  await $.ui.render(spinner('terminal'))
  expect(words[words.length - 1]).toBe(stripTashkeel(THINKING[0]!))
})

test('the demo plays with thikr off, and leaves Claude alone before and after', { options: { thikr: false } }, async ($, on) => {
  const { clock } = engine(on)
  recordSpinner(on)
  await $.ui.render(spinner('terminal'))
  expect(words).toEqual(['Sauteing'])
  expect(await hasLimit($)).toBe(false)

  expect((await $.command.run(run('demo'))).text).toBe(demoReply())
  await $.turn.start({ text: 'hi', turnId: 't' })
  await $.ui.render(spinner('terminal'))
  expect(words[1]).toBe(stripTashkeel(demoScenes()[0]!.text))
  await complete($, 't')
  expect(await hasLimit($)).toBe(true)
  await clock.advance(DEMO_LIMIT_MS)
  expect(await hasLimit($)).toBe(false)
  await $.ui.render(spinner('terminal'))
  expect(words[2]).toBe('Sauteing')
})

test('running /thikr demo again re-arms it', async ($, on) => {
  const { clock } = engine(on)
  recordSpinner(on)
  for (const turn of ['a', 'b']) {
    await $.command.run(run('demo'))
    await $.turn.start({ text: 'hi', turnId: turn })
    await $.ui.render(spinner('terminal'))
    await complete($, turn)
    await clock.advance(DEMO_LIMIT_MS)
  }

  expect(words).toEqual(Array(2).fill(stripTashkeel(demoScenes()[0]!.text)))
})

test('arming again during the limit line restarts cleanly', async ($, on) => {
  const { clock } = engine(on)
  recordSpinner(on)
  await $.command.run(run('demo'))
  await $.turn.start({ text: 'hi', turnId: 't' })
  await complete($, 't')
  await $.command.run(run('demo'))
  // The old 3 s timer must not disarm the new run.
  await clock.advance(DEMO_LIMIT_MS)
  await $.turn.start({ text: 'hi', turnId: 't2' })
  await $.ui.render(spinner('terminal'))

  expect(words).toEqual([stripTashkeel(demoScenes()[0]!.text)])
})

test('the demo writes no config, store or state', async ($, on) => {
  const { clock, written } = engine(on)
  recordSpinner(on)
  await $.command.run(run('demo'))
  await $.turn.start({ text: 'hi', turnId: 't' })
  await $.ui.render(spinner('terminal'))
  await complete($, 't')
  await hasLimit($)
  await clock.advance(DEMO_LIMIT_MS)
  await hasLimit($)

  // Only the feature's own start-of-turn reset of the usage limit (value null) is written.
  expect(written.filter(w => (w as { key?: string; value?: unknown }).key !== 'usageLimit' || (w as { value?: unknown }).value !== null)).toEqual([])
})

test('not armed: spinner, end of turn and limit behave as before', async ($, on) => {
  const { clock } = engine(on)
  recordSpinner(on)
  const seen: string[] = []
  recordTurnDuration(on, seen)
  await $.turn.start({ text: 'hi', turnId: 't' })
  await $.ui.render(spinner('terminal'))
  await complete($, 't')
  await $.ui.render(turnDuration)
  await clock.advance(DEMO_LIMIT_MS)

  expect(words).toEqual([stripTashkeel(THINKING[0]!)])
  expect(seen).toEqual([stripTashkeel(END_OF_TURN)])
  expect(await hasLimit($)).toBe(false)
})

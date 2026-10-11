import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { END_OF_TURN, LONG, SALAWAT, STARTING, THINKING, USAGE_LIMIT, WRITING } from '../../src/features/thikr/phrases.ts'
import { stripTashkeel } from '../../src/features/thikr/rotation.ts'

const SURFACES = ['terminal', 'desktop'] as const

type Mode = 'requesting' | 'responding' | 'thinking' | 'tool-input' | 'tool-use'

// Nothing beneath the plugins starts a turn in a test; this stands for the engine.
const answerTurns = (on: On) =>
  on('turn.start', async (_$, e) => ({ turnId: e.turnId }))

const spinner = (surface: (typeof SURFACES)[number], mode: Mode) => ({
  surface,
  component: 'Spinner' as const,
  requestId: 'main',
  props: { word: 'Sauteing', message: null, suffix: '…', mode },
})

test('spinner shows the thikr in order, keeping the desktop step', async ($, on) => {
  mock.store(on, { arabicTerminals: { unknown: 'none' } })
  mock.env(on, {})
  const clock = mock.clock(on, { now: 0 })
  answerTurns(on)
  const seen: { word: string; message: string | null; suffix: string }[] = []
  on('ui.render', { component: 'Spinner' }, async ($, e) => {
    seen.push({ word: e.props.word, message: e.props.message, suffix: e.props.suffix })
    const { Text } = $.ui.resolve(e)

    return <Text>{e.props.word}</Text>
  })

  for (const surface of SURFACES) {
    seen.length = 0
    await $.turn.start({ text: 'hi', turnId: `t-${surface}` })
    await $.ui.render(spinner(surface, 'requesting'))
    await $.ui.render(spinner(surface, 'thinking'))
    await clock.advance(3000)
    await $.ui.render(spinner(surface, 'tool-use'))
    await $.ui.render(spinner(surface, 'requesting'))
    await $.ui.render(spinner(surface, 'responding'))

    // On desktop the step's row stays up after the tool, so its words stay too.
    const step = (thikr: string | undefined) => (surface === 'terminal' ? thikr : `Sauteing · ${thikr}`)
    expect(STARTING).toContain(seen[0]?.word)
    expect(seen.slice(1).map(s => s.word)).toEqual([THINKING[0], step(THINKING[1]), step(THINKING[1]), step(WRITING[0])])
    expect(seen.every(s => s.message === null && s.suffix === '')).toBe(true)
  }
})

test('a subagent plays the long group, then thinking returns', async ($, on) => {
  mock.store(on, { arabicTerminals: { unknown: 'none' } })
  mock.env(on, {})
  mock.clock(on, { now: 0 })
  answerTurns(on)
  const seen: string[] = []
  on('ui.render', { component: 'Spinner' }, async ($, e) => {
    seen.push(e.props.word)
    const { Text } = $.ui.resolve(e)

    return <Text>{e.props.word}</Text>
  })
  // Stands for the engine running the subagent: the spinner draws meanwhile.
  on('tool.call', async (_engine, e) => {
    await $.ui.render(spinner('terminal', 'tool-use'))

    return { tool: e.tool, tool_use_id: e.tool_use_id, result: { content: 'done' } } as never
  })

  await $.turn.start({ text: 'hi', turnId: 't' })
  await $.ui.render(spinner('terminal', 'thinking'))
  await $.tool.call({ tool: 'Agent', description: 'look', prompt: 'look around', subagent_type: 'Explore' } as never)
  await $.ui.render(spinner('terminal', 'thinking'))

  expect(seen).toEqual([THINKING[0], LONG[0], THINKING[0]])
})

test('compacting plays the long group', async ($, on) => {
  mock.store(on, { arabicTerminals: { unknown: 'none' } })
  mock.env(on, {})
  mock.clock(on, { now: 0 })
  answerTurns(on)
  on('classic.PreCompact', async () => ({}))
  on('classic.PostCompact', async () => ({}))
  const seen: string[] = []
  on('ui.render', { component: 'Spinner' }, async ($, e) => {
    seen.push(e.props.word)
    const { Text } = $.ui.resolve(e)

    return <Text>{e.props.word}</Text>
  })

  await $.turn.start({ text: 'hi', turnId: 't' })
  await $.classic.PreCompact({ trigger: 'auto', custom_instructions: null } as never)
  await $.ui.render(spinner('desktop', 'thinking'))
  await $.classic.PostCompact({ trigger: 'auto', compact_summary: '' } as never)
  await $.ui.render(spinner('desktop', 'thinking'))

  expect(seen).toEqual([LONG[0], THINKING[0]])
})

test('each turn opens on a different starting phrase', async ($, on) => {
  mock.store(on, { arabicTerminals: { unknown: 'none' } })
  mock.env(on, {})
  mock.clock(on, { now: 0 })
  answerTurns(on)
  const seen: string[] = []
  on('ui.render', { component: 'Spinner' }, async ($, e) => {
    seen.push(e.props.word)
    const { Text } = $.ui.resolve(e)

    return <Text>{e.props.word}</Text>
  })

  for (let turn = 0; turn < 8; turn++) {
    await $.turn.start({ text: 'hi', turnId: `t${turn}` })
    await $.ui.render(spinner('terminal', 'requesting'))
  }

  expect(seen.every(word => STARTING.includes(word))).toBe(true)
  expect(seen.every((word, i) => i === 0 || word !== seen[i - 1])).toBe(true)
})

test('a group resumes where it left off', async ($, on) => {
  mock.store(on, { arabicTerminals: { unknown: 'none' } })
  mock.env(on, {})
  const clock = mock.clock(on, { now: 0 })
  answerTurns(on)
  const seen: string[] = []
  on('ui.render', { component: 'Spinner' }, async ($, e) => {
    seen.push(e.props.word)
    const { Text } = $.ui.resolve(e)

    return <Text>{e.props.word}</Text>
  })

  await $.turn.start({ text: 'hi', turnId: 't' })
  await $.ui.render(spinner('terminal', 'thinking'))
  await clock.advance(2000)
  await $.ui.render(spinner('terminal', 'thinking'))
  await $.ui.render(spinner('terminal', 'responding'))
  await clock.advance(5000)
  await $.ui.render(spinner('terminal', 'thinking'))

  expect(seen).toEqual([THINKING[0], THINKING[1], WRITING[0], THINKING[1]])
})

test('salawat mode keeps one salawat for a whole turn, the next one each turn', { options: { thikrMode: 'salawat' } }, async ($, on) => {
  mock.store(on, { arabicTerminals: { unknown: 'none' } })
  mock.env(on, {})
  const clock = mock.clock(on, { now: 0 })
  answerTurns(on)
  const seen: string[] = []
  on('ui.render', { component: 'Spinner' }, async ($, e) => {
    seen.push(e.props.word)
    const { Text } = $.ui.resolve(e)

    return <Text>{e.props.word}</Text>
  })

  for (let turn = 0; turn < SALAWAT.length + 1; turn++) {
    await $.turn.start({ text: 'hi', turnId: `t${turn}` })
    for (const mode of ['requesting', 'thinking', 'tool-use', 'responding'] as const) {
      await $.ui.render(spinner('terminal', mode))
      await clock.advance(20_000)
    }
  }

  const turns = SALAWAT.length + 1
  for (let turn = 0; turn < turns; turn++) {
    expect(seen.slice(turn * 4, turn * 4 + 4)).toEqual(Array(4).fill(SALAWAT[turn % SALAWAT.length]))
  }
})

test('desktop keeps the step row\'s words after its tool ends', async ($, on) => {
  mock.store(on, { arabicTerminals: { unknown: 'none' } })
  mock.env(on, {})
  mock.clock(on, { now: 0 })
  answerTurns(on)
  const words: string[] = []
  on('ui.render', { component: 'Spinner' }, async ($, e) => {
    words.push(e.props.word)
    const { Text } = $.ui.resolve(e)

    return <Text>{e.props.word}</Text>
  })
  const desktop = (mode: Mode, word: string) => ({ ...spinner('desktop', mode), props: { word, message: null, suffix: '…', mode } })

  await $.turn.start({ text: 'hi', turnId: 't' })
  await $.ui.render(desktop('thinking', 'Working'))
  await $.ui.render(desktop('tool-use', 'Running a command'))
  // The tool ended; the desktop keeps the step's row up while Claude reads.
  await $.ui.render(desktop('requesting', 'Running a command'))
  await $.ui.render(desktop('thinking', 'Musing'))

  expect(words).toEqual([THINKING[0], `Running a command · ${THINKING[0]}`, `Running a command · ${THINKING[0]}`, THINKING[0]])
})

test('tashkeel off strips the marks', { options: { thikrTashkeel: false } }, async ($, on) => {
  mock.store(on, { arabicTerminals: { unknown: 'none' } })
  mock.env(on, {})
  mock.clock(on, { now: 0 })
  answerTurns(on)
  let word = ''
  on('ui.render', { component: 'Spinner' }, async ($, e) => {
    word = e.props.word
    const { Text } = $.ui.resolve(e)

    return <Text>{word}</Text>
  })
  await $.turn.start({ text: 'hi', turnId: 't' })
  await $.ui.render(spinner('terminal', 'thinking'))

  expect(word).toBe(stripTashkeel(THINKING[0] ?? ''))
})

test('off leaves Claude\'s words alone', { options: { thikr: false } }, async ($, on) => {
  mock.store(on, { arabicTerminals: { unknown: 'none' } })
  mock.env(on, {})
  let word = ''
  on('ui.render', { component: 'Spinner' }, async ($, e) => {
    word = e.props.word
    const { Text } = $.ui.resolve(e)

    return <Text>{word}</Text>
  })
  await $.ui.render(spinner('terminal', 'thinking'))

  expect(word).toBe('Sauteing')
})

test('end of turn says tamma bihamdillah, and end off keeps Claude\'s word', async ($, on) => {
  mock.store(on, { arabicTerminals: { unknown: 'none' } })
  mock.env(on, {})
  let word = ''
  on('ui.render', { component: 'TurnDuration' }, async ($, e) => {
    word = e.props.word
    const { Text } = $.ui.resolve(e)

    return <Text>{word}</Text>
  })
  await $.ui.render({ surface: 'terminal', component: 'TurnDuration', requestId: 'm1', props: { word: 'Baked', durationMs: 3000 } })

  expect(word).toBe(END_OF_TURN)
})

test('/thikr shows status and help', async $ => {
  const ran = await $.command.run({
    command: 'thikr',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  })

  expect(ran.text).toContain('thikr on · speed auto · tashkeel on · end on · mode all')
  expect(ran.text).toContain('/thikr speed')
})

test('/thikr speed refuses out-of-range values', async $ => {
  const ran = await $.command.run({
    command: 'thikr',
    args: 'speed 0',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  })

  expect(ran.text).toContain('auto, or a whole number of seconds from 1 to 60')
})

test('a usage limit shows hasbiyallah above the prompt until it resets', async ($, on) => {
  mock.store(on, { arabicTerminals: { unknown: 'none' } })
  mock.env(on, {})
  const clock = mock.clock(on, { now: Date.parse('2026-10-10T12:00:00Z') })
  on('session.usage', async () => ({
    value: {
      startedAt: 0,
      context: { window: 200_000 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 100, resetsAt: '2026-10-10T13:00:00Z' }],
    },
  }))
  on('classic.StopFailure', async () => ({}))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
  const band = {
    surface: 'terminal' as const,
    component: 'AbovePrompt' as const,
    requestId: 'band',
    props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  }

  await $.classic.StopFailure({ error: 'rate_limit' })
  const shown = await $.ui.mount({ plugin: 'muslim', ...band })
  expect(await shown.find({ type: 'Text', text: USAGE_LIMIT })).toBeDefined()
  await shown.unmount()

  await clock.advance(60 * 60 * 1000)
  const cleared = await $.ui.mount({ plugin: 'muslim', ...band })
  expect(await cleared.find({ type: 'Text', text: USAGE_LIMIT })).toBeUndefined()
  await cleared.unmount()
})

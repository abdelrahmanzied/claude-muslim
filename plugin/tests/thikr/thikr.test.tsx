import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { END_OF_TURN, LONG, SALAWAT, STARTING, THINKING, USAGE_LIMIT, WRITING } from '../../src/features/thikr/phrases.ts'
import { stripTashkeel } from '../../src/shared/arabic/visual.ts'
import { ATHKAR_QUIET } from '../fixtures/config.ts'

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
const shown = (surface: (typeof SURFACES)[number], text: string) => surface === 'terminal' ? stripTashkeel(text) : text

test('spinner shows the thikr in order, keeping the desktop step', async ($, on) => {
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
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
    expect(STARTING.map(text => shown(surface, text))).toContain(seen[0]?.word)
    expect(seen.slice(1).map(s => s.word)).toEqual([shown(surface, THINKING[0]!), step(shown(surface, THINKING[1]!)), step(shown(surface, THINKING[1]!)), step(shown(surface, WRITING[0]!))])
    expect(seen.every(s => s.message === null && s.suffix === '')).toBe(true)
  }
})

test('a subagent plays the long group, then thinking returns', async ($, on) => {
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
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

  expect(seen).toEqual([THINKING[0], LONG[0], THINKING[0]].map(text => stripTashkeel(text!)))
})

test('compacting plays the long group', async ($, on) => {
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
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
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
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

  expect(seen.every(word => STARTING.some(text => stripTashkeel(text) === word))).toBe(true)
  expect(seen.every((word, i) => i === 0 || word !== seen[i - 1])).toBe(true)
})

test('a group resumes where it left off', async ($, on) => {
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
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

  expect(seen).toEqual([THINKING[0], THINKING[1], WRITING[0], THINKING[1]].map(text => stripTashkeel(text!)))
})

test('salawat mode keeps one salawat for a whole turn, the next one each turn', { options: { thikrMode: 'salawat' } }, async ($, on) => {
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
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
    expect(seen.slice(turn * 4, turn * 4 + 4)).toEqual(Array(4).fill(stripTashkeel(SALAWAT[turn % SALAWAT.length]!)))
  }
})

test('desktop keeps the step row\'s words after its tool ends', async ($, on) => {
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
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

test('terminal always strips tashkeel even when the desktop setting is on', { options: { tashkeel: true } }, async ($, on) => {
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'reversed' } })
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

  expect(word).not.toMatch(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/)
})

test('desktop follows the tashkeel setting', { options: { tashkeel: false } }, async ($, on) => {
  mock.env(on, {})
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
  mock.clock(on, { now: 0 })
  answerTurns(on)
  let word = ''
  on('ui.render', { component: 'Spinner' }, async ($, e) => {
    word = e.props.word
    const { Text } = $.ui.resolve(e)

    return <Text>{word}</Text>
  })
  await $.turn.start({ text: 'hi', turnId: 'desktop' })
  await $.ui.render(spinner('desktop', 'thinking'))

  expect(word).toBe(stripTashkeel(THINKING[0] ?? ''))
})

test('off leaves Claude\'s words alone', { options: { thikr: false } }, async ($, on) => {
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
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
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
  mock.env(on, {})
  let word = ''
  on('ui.render', { component: 'TurnDuration' }, async ($, e) => {
    word = e.props.word
    const { Text } = $.ui.resolve(e)

    return <Text>{word}</Text>
  })
  await $.ui.render({ surface: 'terminal', component: 'TurnDuration', requestId: 'm1', props: { word: 'Baked', durationMs: 3000 } })

  expect(word).toBe(stripTashkeel(END_OF_TURN))
})

test('/thikr shows status and help', async $ => {
  const ran = await $.command.run({
    command: 'thikr',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  })

  expect(ran.text?.split('\n').slice(0, 2)).toEqual(['**Muslim › Thikr**', 'To change a setting or see every option: `/thikr help`'])
  expect(ran.text).toContain('| Speed | How long each phrase stays | auto |')
  expect(ran.text).toContain('| Mode | Which phrases play | all |')
})

test('/thikr unknown subcommands show help', async $ => {
  const ran = await $.command.run({ command: 'thikr', args: 'tashkeel off', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(ran.text?.split('\n')[0]).toBe('**Muslim › Thikr › Help**')
  expect(ran.text).toContain('| `/thikr speed` |')
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

test('a usage limit shows hasbiyallah above the prompt until it resets', { options: { ...ATHKAR_QUIET } }, async ($, on) => {
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
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
  expect(await shown.find({ type: 'Text', text: stripTashkeel(USAGE_LIMIT) })).toBeDefined()
  await shown.unmount()

  await clock.advance(60 * 60 * 1000)
  const cleared = await $.ui.mount({ plugin: 'muslim', ...band })
  expect(await cleared.find({ type: 'Text', text: USAGE_LIMIT })).toBeUndefined()
  await cleared.unmount()
})

test('a response reporting a full usage window shows hasbiyallah before any turn fails', { options: { ...ATHKAR_QUIET } }, async ($, on) => {
  mock.clock(on, { now: Date.parse('2026-10-10T12:00:00Z') })
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
  mock.env(on, {})
  on('session.measure', async (_$, e) => ({ changed: e.changed }))
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
  const context = { window: 200_000 }

  // Not full: nothing.
  await $.session.measure({ context, rateLimits: [{ kind: 'five_hour', percentUsed: 80 }], changed: ['rateLimits'] })
  const before = await $.ui.mount({ plugin: 'muslim', ...band })
  expect(await before.find({ type: 'Text', text: stripTashkeel(USAGE_LIMIT) })).toBeUndefined()
  await before.unmount()

  await $.session.measure({ context, rateLimits: [{ kind: 'five_hour', percentUsed: 100, resetsAt: '2026-10-10T13:00:00Z' }], changed: ['rateLimits'] })
  const shown = await $.ui.mount({ plugin: 'muslim', ...band })
  expect(await shown.find({ type: 'Text', text: stripTashkeel(USAGE_LIMIT) })).toBeDefined()
  await shown.unmount()
})

for (const surface of ['terminal', 'desktop'] as const) {
  for (const [color, theme, expected] of [['orange', 'light', 'claude'], ['orange', 'dark', 'claude'], ['green', 'light', '#0b7a50'], ['green', 'dark', '#1a9466']] as const) {
    test(`usage-limit color ${surface} ${color} ${theme}`, { options: { ...ATHKAR_QUIET, color,  } }, async ($, on) => {
      mock.env(on, {})
      mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
      mock.clock(on, { now: Date.parse('2026-10-10T12:00:00Z') })
      on('config.list', async () => ({ value: [{ key: 'theme', label: 'Theme', kind: 'choice', value: theme, provider: { plugin: 'engine', tier: 'core' }, isLocked: false }] }))
      on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
        const { Box } = $.ui.resolve(e)
        return <Box />
      })
      on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [{ kind: 'five_hour', percentUsed: 100, resetsAt: '2026-10-10T13:00:00Z' }] } }))
      on('classic.StopFailure', async () => ({}))
      await $.classic.StopFailure({ error: 'rate_limit' })
      const shown = await $.ui.mount({ plugin: 'muslim', surface, component: 'AbovePrompt', requestId: 'colors', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} } })
      const accent = await shown.find({ type: 'Text', text: surface === 'terminal' ? stripTashkeel(USAGE_LIMIT) : USAGE_LIMIT })
      expect(accent?.props.color).toBe(expected)
      await shown.unmount()
    })
  }
}

test('child lifecycle preserves the main phrase progress, usage limit and running ticker', { options: { thikrSpeed: '2' } }, async ($, on) => {
  mock.env(on, {})
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
  const clock = mock.clock(on, { now: 0 })
  answerTurns(on)
  on('turn.complete', async (_$, e) => ({ text: e.answer }))
  const limitWrites: unknown[] = []
  on('state.set', { plugin: 'muslim', key: 'usageLimit' }, async (_$, e, next) => { limitWrites.push(e.value); return next(e) })
  let invalidations = 0
  on('ui.invalidate', async () => { invalidations++; return { value: undefined } })
  const words: string[] = []
  on('ui.render', { component: 'Spinner' }, async ($, e) => {
    words.push(e.props.word)
    const { Text } = $.ui.resolve(e)
    return <Text>{e.props.word}</Text>
  })
  await $.turn.start({ text: 'main', turnId: 'main' })
  await $.ui.render(spinner('terminal', 'thinking'))
  await clock.advance(2000)
  await $.ui.render(spinner('terminal', 'thinking'))
  await $.ui.render(spinner('terminal', 'responding'))
  await $.turn.start({ text: 'child', turnId: 'child', agentId: 'agent' })
  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, reason: 'answer', turnId: 'child', agentId: 'agent' } as never)
  await $.ui.render(spinner('terminal', 'responding'))
  await $.ui.render(spinner('terminal', 'thinking'))
  expect(words).toEqual([THINKING[0], THINKING[1], WRITING[0], WRITING[0], THINKING[1]].map(s => stripTashkeel(s!)))
  expect(limitWrites).toEqual([null])
  const before = invalidations
  await clock.advance(500)
  expect(invalidations).toBeGreaterThan(before)
})

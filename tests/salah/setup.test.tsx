import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const SURFACES = ['terminal', 'desktop'] as const

const band = (surface: (typeof SURFACES)[number]) => ({
  plugin: 'muslim',
  surface,
  component: 'AbovePrompt' as const,
  requestId: 'band',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} },
})

// Stands for the engine's own band beneath the plugin.
const engineBand = (on: On) =>
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })

const footer = (surface: (typeof SURFACES)[number]) => ({
  plugin: 'muslim',
  surface,
  component: 'SessionMode' as const,
  requestId: 'modes',
  props: { modes: [] as readonly string[] },
})

// Stands for the engine's own mode labels beneath the plugin.
const engineModes = (on: On) =>
  on('ui.render', { component: 'SessionMode' }, async ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text dimColor>focus</Text>
  })

// The footer with the band mounted beside it, as in a real session: the
// pray line's timer starts from the band's first draw.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mountFooter = async ($: any, surface: (typeof SURFACES)[number]) => {
  const bandShown = await $.ui.mount(band(surface))
  const shown = await $.ui.mount(footer(surface))

  return {
    find: shown.find as typeof shown.find,
    drawn: shown.drawn as typeof shown.drawn,
    unmount: async () => {
      await shown.unmount()
      await bandShown.unmount()
    },
  }
}

const settingsWriter = (on: On) => {
  const written: { key: string; value: unknown }[] = []
  on('config.set', async (_$, e) => (written.push({ key: e.key, value: e.value }), { value: e.value }))

  return written
}

// Stands for the user typing `typed` under Other in the question dialog.
const answerDialog = (on: On, typed: string) =>
  on('tool.call', async (_$, e) => {
    const question = (e as unknown as { questions: { question: string }[] }).questions[0]?.question ?? ''

    return { tool: e.tool, tool_use_id: e.tool_use_id, result: { questions: [], answers: { [question]: typed } } } as never
  })

// Stands for Claude reading the typed place.
const answerCities = (on: On, cities: unknown[]) =>
  on('model.complete', async () => {
    const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

    return { value: { isAnswered: true as const, text: JSON.stringify({ cities }), usage } }
  })

const MUNICH = { name: 'Munich, Germany', country: 'DE', latitude: 48.14, longitude: 11.58, timeZone: 'Europe/Berlin' }

test('before setup the band asks for the place; Not now puts it off for good', { options: { athkar: false } }, async ($, on) => {
  mock.env(on, {})
  engineBand(on)
  // Stands for the plugin's store.
  const stored: Record<string, unknown> = {}
  on('store.get', async () => ({ value: undefined }))
  on('store.set', async (_$, e) => (stored[e.key] = e.value, { value: undefined }))
  for (const surface of SURFACES) {
    const shown = await $.ui.mount(band(surface))
    expect(await shown.find({ type: 'Button', key: 'salah-city' })).toBeDefined()
    await shown.unmount()
  }

  const shown = await $.ui.mount(band('terminal'))
  await shown.press({ key: 'salah-later' })
  expect(await shown.find({ type: 'Button', key: 'salah-city' })).toBeUndefined()
  await shown.unmount()
  expect(stored).toEqual({ salahSetupLater: true })
})

test('another city: typed in any language, found by Claude, saved', { options: { athkar: false } }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  engineBand(on)
  const written = settingsWriter(on)
  answerDialog(on, 'ميونخ')
  answerCities(on, [MUNICH])

  const shown = await $.ui.mount(band('desktop'))
  await shown.press({ key: 'salah-city' })
  await shown.unmount()

  expect(written).toEqual([{ key: 'muslim.salahPlace', value: 'Munich, Germany; 48.14, 11.58; Europe/Berlin; DE' }])
})

test('/salah city with no name asks the setup question', { options: { athkar: false } }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  const written = settingsWriter(on)
  answerDialog(on, 'Munich')
  answerCities(on, [MUNICH])

  const ran = await $.command.run({ command: 'salah', args: 'city', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })

  expect(ran.text).toBe('**City:** Munich, Germany · Muslim World League\nCheck today\'s times above the prompt.')
  expect(written[0]?.value).toBe('Munich, Germany; 48.14, 11.58; Europe/Berlin; DE')
})

test('a saved place shows no setup band', { options: { athkar: false, salahPlace: 'Munich, Germany; 48.14, 11.58; Europe/Berlin; DE' } }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  engineBand(on)
  const shown = await $.ui.mount(band('terminal'))

  expect(await shown.find({ type: 'Button', key: 'salah-city' })).toBeUndefined()
  await shown.unmount()
})

const AT_MUNICH = { salahPlace: 'Munich, Germany; 48.1372, 11.5755; Europe/Berlin; DE' }
// The pray line in the mounted footer, or undefined when it has none.
const prayRow = async (shown: { find: (query: { key: string }) => Promise<{ text?: string } | undefined> }) =>
  (await shown.find({ key: 'salah-line' }))?.text

test('review buttons cross the old minute bounds and save on both surfaces', { options: { athkar: false, ...AT_MUNICH, salahAdjust: '0 0 0 60 0 -60' } }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  mock.clock(on, { now: Date.parse('2026-10-10T10:00:00Z') })
  engineBand(on)
  const written = settingsWriter(on)

  for (const surface of SURFACES) {
    await $.command.run({ command: 'salah', args: 'adjust', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
    const shown = await $.ui.mount(band(surface))
    await shown.press({ key: 'salah-asr-plus' })
    await shown.press({ key: 'salah-isha-minus' })
    await shown.press({ key: 'salah-save' })
    await shown.unmount()
  }
  expect(written).toEqual(SURFACES.map(() => ({ key: 'muslim.salahAdjust', value: '0 0 0 61 0 -61' })))
})

test('/salah adjust opens the review form: minutes move a pray, Save keeps them', { options: AT_MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  mock.clock(on, { now: Date.parse('2026-10-10T10:00:00Z') })
  engineBand(on)
  const written = settingsWriter(on)

  await $.command.run({ command: 'salah', args: 'adjust', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  for (const surface of SURFACES) {
    const shown = await $.ui.mount(band(surface))
    expect(await shown.find({ type: 'Text', text: '15:59' })).toBeDefined()
    await shown.unmount()
  }

  const shown = await $.ui.mount(band('terminal'))
  for (let i = 0; i < 5; i++) await shown.press({ key: 'salah-asr-plus' })
  await shown.press({ key: 'salah-isha-minus' })
  expect(await shown.find({ type: 'Text', text: '16:04' })).toBeDefined()
  expect(await shown.find({ type: 'Text', text: '20:11' })).toBeDefined()

  await shown.press({ key: 'salah-save' })
  expect(written).toEqual([{ key: 'muslim.salahAdjust', value: '0 0 0 5 0 -1' }])
  expect(await shown.find({ type: 'Button', key: 'salah-save' })).toBeUndefined()
  await shown.unmount()
})

test('Skip closes the review form without saving', { options: AT_MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  mock.clock(on, { now: Date.parse('2026-10-10T10:00:00Z') })
  engineBand(on)
  const written = settingsWriter(on)

  await $.command.run({ command: 'salah', args: 'adjust', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  const shown = await $.ui.mount(band('desktop'))
  await shown.press({ key: 'salah-asr-plus' })
  await shown.press({ key: 'salah-skip' })

  expect(await shown.find({ type: 'Button', key: 'salah-save' })).toBeUndefined()
  expect(written).toEqual([])
  await shown.unmount()
})

test('always: the pray row shows the next pray, then counts down, and never toasts', { options: { athkar: false, ...AT_MUNICH, salahShow: 'always' } }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  // 13:30 in Munich on 10 October 2026; Asr is at 15:59.
  const clock = mock.clock(on, { now: Date.parse('2026-10-10T11:30:00Z') })
  engineBand(on)
  engineModes(on)
  const toasts: string[] = []
  on('ui.toast', async (_$, e) => (toasts.push(e.text), { value: undefined }))

  const shown = await mountFooter($, 'terminal')
  await clock.advance(1)
  expect(await prayRow(shown)).toBe('☾ العصر ١٥:٥٩')

  // 15:39: twenty minutes before Asr.
  await clock.advance(129 * 60_000)
  expect(await prayRow(shown)).toBe('☾ العصر ٢٠:٠٠')
  expect(toasts).toEqual([])
  await shown.unmount()
})

test('always: the call shows once the pray is in, and never toasts', { options: { athkar: false, ...AT_MUNICH, salahShow: 'always' } }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  // 15:58 in Munich, a minute before Asr.
  const clock = mock.clock(on, { now: Date.parse('2026-10-10T13:58:00Z') })
  engineBand(on)
  engineModes(on)
  const toasts: string[] = []
  on('ui.toast', async (_$, e) => (toasts.push(e.text), { value: undefined }))

  const shown = await mountFooter($, 'terminal')
  await clock.advance(90_000)
  expect(await prayRow(shown)).toBe('حان وقت صلاة العصر')
  expect(toasts).toEqual([])
  await shown.unmount()
})

test('off leaves no pray row', { options: { athkar: false, ...AT_MUNICH, salahShow: 'off' } }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  engineBand(on)
  engineModes(on)

  const shown = await mountFooter($, 'terminal')
  expect(await prayRow(shown)).toBe(undefined)
  await shown.unmount()
})

test('show off hides a line left by the last load and clears it after drawing, not during it', { options: { athkar: false, ...AT_MUNICH, salahShow: 'off' } }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  const clock = mock.clock(on, { now: Date.parse('2026-10-10T11:30:00Z') })
  engineBand(on)
  engineModes(on)
  let left: string | null = '☾ الفجر ٠٦:١٥'
  on('state.get', { plugin: 'muslim', key: 'salahLine' }, async (_$, e, next) => (left ? { value: { value: left, version: 1 } } : next(e)))
  on('state.set', { plugin: 'muslim', key: 'salahLine' }, async (_$, e, next) => {
    const result = await next(e)
    if (e.value === null) left = null

    return result
  })

  const shown = await mountFooter($, 'terminal')
  expect(await prayRow(shown)).toBe(undefined)
  expect(left).not.toBe(null)
  await clock.settle()
  expect(left).toBe(null)
  await shown.unmount()
})

// A settings change reloads the module; $.state keeps the last load's line.
const leftLine = (on: On, text: string | null) =>
  on('state.get', { plugin: 'muslim', key: 'salahLine' }, async () => ({ value: { value: text, version: 1 } }))

test('after a change to minutes, a line left by the last load is not drawn outside the window', { options: { athkar: false, ...AT_MUNICH, salahShow: '20' } }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  mock.clock(on, { now: Date.parse('2026-10-10T10:00:00Z') })
  engineBand(on)
  engineModes(on)
  leftLine(on, '☾ الظهر ١٣:٠٢')

  const shown = await mountFooter($, 'terminal')
  expect(await prayRow(shown)).toBe(undefined)
  await shown.unmount()
})

test('after off then always, the line shows at once, before any timer', { options: { athkar: false, ...AT_MUNICH, salahShow: 'always' } }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  mock.clock(on, { now: Date.parse('2026-10-10T10:00:00Z') })
  engineBand(on)
  engineModes(on)
  leftLine(on, null)

  const shown = await mountFooter($, 'terminal')
  expect(await prayRow(shown)).toBe('☾ الظهر ١٣:٠٢')
  await shown.unmount()
})

test('show minutes: the line is empty until the window, then counts down', { options: AT_MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  const clock = mock.clock(on, { now: Date.parse('2026-10-10T11:30:00Z') })
  engineBand(on)
  engineModes(on)

  const shown = await mountFooter($, 'terminal')
  expect(await prayRow(shown)).toBe(undefined)
  await clock.advance(129 * 60_000)
  expect(await prayRow(shown)).toBe('☾ العصر ٢٠:٠٠')
  await shown.unmount()
})

test('show minutes: the call shows once the pray is in, then the line clears', { options: AT_MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  // 15:58 in Munich, a minute before Asr.
  const clock = mock.clock(on, { now: Date.parse('2026-10-10T13:58:00Z') })
  engineBand(on)
  engineModes(on)

  const shown = await mountFooter($, 'terminal')
  await clock.advance(90_000)
  expect(await prayRow(shown)).toBe('حان وقت صلاة العصر')
  await clock.advance(16 * 60_000)
  expect(await prayRow(shown)).toBe(undefined)
  await shown.unmount()
})

test('fewer show minutes move the window; no athan skips the call', { options: { athkar: false, ...AT_MUNICH, salahShow: '5', salahAthan: false } }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  const clock = mock.clock(on, { now: Date.parse('2026-10-10T13:44:00Z') })
  engineBand(on)
  engineModes(on)

  const shown = await mountFooter($, 'terminal')
  expect(await prayRow(shown)).toBe(undefined)
  await clock.advance(10 * 60_000)
  expect(await prayRow(shown)).toBe('☾ العصر ٠٥:٠٠')
  await clock.advance(20 * 60_000)
  expect(await prayRow(shown)).toBe(undefined)
  await shown.unmount()
})

test('the countdown ticks every second in the window, every 30 s outside it', { options: AT_MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  const clock = mock.clock(on, { now: Date.parse('2026-10-10T11:30:00Z') })
  engineBand(on)
  engineModes(on)

  const shown = await mountFooter($, 'terminal')
  await clock.advance(60_000)
  expect(await prayRow(shown)).toBe(undefined)

  // Into the window, then ten seconds of it: it moves each second.
  await clock.advance(128 * 60_000)
  const seen = new Set<string | undefined>()
  for (let i = 0; i < 10; i++) {
    await clock.advance(1_000)
    seen.add(await prayRow(shown))
  }
  expect(seen.size).toBe(10)
  expect(await prayRow(shown)).toBe('☾ العصر ١٩:٥٠')
  await shown.unmount()
})

test('when the pray comes in a minaret rises once, folds, and leaves the footer independent', { options: AT_MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  // 15:58:45 in Munich; Asr is at 15:59.
  const clock = mock.clock(on, { now: Date.parse('2026-10-10T13:58:45Z') })
  engineBand(on)
  engineModes(on)

  const shown = await $.ui.mount(band('terminal'))
  const modes = await $.ui.mount(footer('terminal'))
  expect(await shown.find({ type: 'Text', text: '   ☾   ' })).toBeUndefined()

  // Asr comes in on a one-second tick: the base appears first.
  await clock.advance(15_200)
  expect(await shown.find({ type: 'Text', text: ' ▐███▌ ' })).toBeDefined()
  expect(await shown.find({ type: 'Text', text: '   ☾   ' })).toBeUndefined()
  expect(await shown.find({ type: 'Text', text: 'حان وقت صلاة العصر' })).toBeUndefined()

  await clock.advance(1_900)
  expect(await shown.find({ type: 'Text', text: '   ☾   ' })).toBeDefined()
  expect(await shown.find({ type: 'Text', text: 'حان وقت صلاة العصر' })).toBeDefined()

  // About three seconds in all, then the band folds and the footer keeps its call.
  await clock.advance(1_000)
  expect(await shown.find({ type: 'Text', text: '   ☾   ' })).toBeUndefined()
  expect(await prayRow(modes)).toBe('حان وقت صلاة العصر')

  expect(await shown.find({ key: 'salah-athan-row' })).toBeDefined()
  await shown.press({ key: 'salah-athan-close' })
  expect(await shown.find({ key: 'salah-athan-row' })).toBeUndefined()
  expect(await prayRow(modes)).toBe('حان وقت صلاة العصر')

  // Never again for the same pray, including after closing during its freshness window.
  await clock.advance(60_000)
  expect(await shown.find({ type: 'Text', text: ' ▐███▌ ' })).toBeUndefined()
  await modes.unmount()
  await shown.unmount()
})

test('no minaret with athan off, nor during a survey', { options: { athkar: false, ...AT_MUNICH, salahAthan: false } }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  const clock = mock.clock(on, { now: Date.parse('2026-10-10T13:58:45Z') })
  engineBand(on)

  const shown = await $.ui.mount(band('terminal'))
  await clock.advance(18_000)
  expect(await shown.find({ type: 'Text', text: ' ▐███▌ ' })).toBeUndefined()
  await shown.unmount()
})

test('a survey hides the minaret', { options: AT_MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  const clock = mock.clock(on, { now: Date.parse('2026-10-10T13:58:45Z') })
  engineBand(on)

  const survey = { ...band('terminal'), props: { ...band('terminal').props, hasSurvey: true } }
  const shown = await $.ui.mount(survey)
  await clock.advance(18_000)
  expect(await shown.find({ type: 'Text', text: ' ▐███▌ ' })).toBeUndefined()
  await shown.unmount()
})

test('the countdown starts the second the window opens, not on the next 30 s tick', { options: AT_MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  // 15:38:10 in Munich: the window (20 min before Asr at 15:59) opens at 15:39:00.
  const clock = mock.clock(on, { now: Date.parse('2026-10-10T13:38:10Z') })
  engineBand(on)
  engineModes(on)

  const shown = await mountFooter($, 'terminal')
  await clock.advance(49_000)
  expect(await prayRow(shown)).toBe(undefined)
  await clock.advance(1_000)
  expect(await prayRow(shown)).toBe('☾ العصر ٢٠:٠٠')
  await clock.advance(1_000)
  expect(await prayRow(shown)).toBe('☾ العصر ١٩:٥٩')
  await shown.unmount()
})

test('the pray line sits in the footer modes in claude color, beside the engine\'s labels, on both surfaces', { options: { ...AT_MUNICH, salahShow: 'always' } }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  const clock = mock.clock(on, { now: Date.parse('2026-10-10T11:30:00Z') })
  engineBand(on)
  engineModes(on)

  for (const surface of SURFACES) {
    const band_ = await $.ui.mount(band(surface))
    const shown = await $.ui.mount(footer(surface))
    await clock.advance(1)
    expect((await shown.find({ key: 'salah-line' }))?.text).toBe('☾ العصر ١٥:٥٩')
    expect(JSON.stringify(await shown.drawn())).toContain('"color":"claude"')
    expect(await shown.find({ type: 'Text', text: 'focus' })).toBeDefined()
    // No pray row in the band any more.
    expect(await band_.find({ key: 'salah-line' })).toBeUndefined()
    await shown.unmount()
    await band_.unmount()
  }
})

test('the review form shows in the band while the pray line shows in the footer', { options: AT_MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  const clock = mock.clock(on, { now: Date.parse('2026-10-10T13:45:00Z') })
  engineBand(on)
  engineModes(on)

  const shown = await $.ui.mount(band('terminal'))
  const modes = await $.ui.mount(footer('terminal'))
  await clock.advance(1_000)
  await $.command.run({ command: 'salah', args: 'adjust', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(await shown.find({ type: 'Button', key: 'salah-save' })).toBeDefined()
  expect(await prayRow(modes)).toMatch(/^☾ العصر ١[٣٤]:/)
  await modes.unmount()
  await shown.unmount()
})

test('the countdown ticks from the load alone: no prompt draw needed (off, then show 60)', { options: { athkar: false, ...AT_MUNICH, salahShow: '60' } }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  // 14:30 in Munich: Asr at 15:59 is 89 minutes off, the 60-minute window opens at 14:59.
  const clock = mock.clock(on, { now: Date.parse('2026-10-10T12:30:00Z') })
  engineModes(on)
  const toasts: string[] = []
  on('ui.toast', async (_$, e) => (toasts.push(e.text), { value: undefined }))

  // Only the footer is mounted: the band is never drawn.
  const shown = await $.ui.mount(footer('desktop'))
  await clock.advance(1000)
  expect(await prayRow(shown)).toBe(undefined)
  await clock.advance(29 * 60_000)
  const seen = new Set<string | undefined>()
  for (let i = 0; i < 5; i++) {
    await clock.advance(1_000)
    seen.add(await prayRow(shown))
  }
  expect(seen.size).toBe(5)
  expect(toasts).toEqual([])
  await shown.unmount()
})

for (const surface of ['terminal', 'desktop'] as const) {
  for (const [color, theme, expected] of [['orange', 'light', 'claude'], ['orange', 'dark', 'claude'], ['green', 'light', '#0b7a50'], ['green', 'dark', '#1a9466']] as const) {
    test(`salah setup color ${surface} ${color} ${theme}`, { options: { athkar: false, color,  } }, async ($, on) => {
      mock.env(on, {})
      mock.store(on, { arabicTerminals: { unknown: 'plain' } })
      mock.clock(on, { now: Date.parse('2026-10-10T12:00:00Z') })
      on('config.list', async () => ({ value: [{ key: 'theme', label: 'Theme', kind: 'choice', value: theme, provider: { plugin: 'engine', tier: 'core' }, isLocked: false }] }))
      on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
        const { Box } = $.ui.resolve(e)
        return <Box />
      })

      const shown = await $.ui.mount({ plugin: 'muslim', surface, component: 'AbovePrompt', requestId: 'colors', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} } })
      const accent = (await shown.findAll({ type: 'Text' }))[0]
      expect(accent?.props.color).toBe(expected)
      await shown.unmount()
    })
  }
}

for (const [color, expected] of [['orange', 'claude'], ['blue', '#4a7fc0']] as const) {
  test(`salah prayer, review and minaret accents follow ${color}`, { options: { ...AT_MUNICH, color, athkar: false, salahShow: 'always' } }, async ($, on) => {
    mock.env(on, {})
    mock.store(on, { arabicTerminals: { unknown: 'plain' } })
    const clock = mock.clock(on, { now: Date.parse('2026-10-10T12:00:00Z') })
    on('config.list', async () => ({ value: [] }))
    engineBand(on)
    engineModes(on)
    const run = (args: string) => $.command.run({ command: 'salah', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
    for (const surface of SURFACES) {
      const modes = await $.ui.mount(footer(surface))
      const line = (await modes.findAll({ type: 'Text' })).find(row => row.props.bold === true)
      expect(line?.props.color).toBe(expected)
      expect((await modes.find({ type: 'Text', text: 'focus' }))?.props.color).toBeUndefined()
      await modes.unmount()
      await run('adjust')
      const review = await $.ui.mount(band(surface))
      const heading = (await review.findAll({ type: 'Text' }))[0]
      expect(heading?.text).toContain("Check today's times")
      expect(heading?.props.color).toBe(expected)
      expect((await review.find({ type: 'Text', text: 'Fajr' }))?.props.color).toBeUndefined()
      await review.press({ key: 'salah-skip' })
      await review.unmount()
    }
    await run('athan demo')
    const minaret = await $.ui.mount(band('terminal'))
    await clock.advance(2500)
    expect((await minaret.find({ type: 'Text', text: '   ☾   ' }))?.props.color).toBe(expected)
    expect((await minaret.find({ type: 'Text', text: 'حان وقت صلاة الفجر' }))?.props.color).toBe(expected)
    expect((await minaret.find({ type: 'Text', text: ' ▐███▌ ' }))?.props.color).toBeUndefined()
    await minaret.unmount()
  })
}

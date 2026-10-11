import { mock, test, expect } from 'claude-code/testing'
import type { On } from 'claude-code'
import { readOptions } from '../../../src/config.ts'
import { install } from '../../../src/shared/arabic/install.tsx'
import { ARABIC_MODES, terminalArabic } from '../../../src/shared/arabic/terminal.ts'

const band = (surface: 'terminal' | 'desktop', hasSurvey = false, requestId = 'arabic-check') => ({
  plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId,
  props: { hasSurvey, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} },
})
const engineBand = (on: On) => on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
  const { Text } = $.ui.resolve(e)
  return <Text key="engine-band">engine band</Text>
})
const OPTIONS = { athkar: false, thikr: false, tashkeel: true, salahShow: 'off', salahPlace: 'Munich, Germany; 48.14, 11.58; Europe/Berlin; DE' }
const sample = 'بِسْمِ اللَّهِ'
const rows = { type: 'Button' as const }

test('survey rows use fixed mode order and Text samples', { options: OPTIONS }, async ($, on) => {
  mock.env(on, { TERM_PROGRAM: 'Apple_Terminal' })
  mock.store(on)
  engineBand(on)
  install(on, readOptions(OPTIONS))
  const shown = await $.ui.mount(band('terminal'))
  const buttons = await shown.findAll(rows)
  expect(buttons.map(button => button.props.hotkey)).toEqual(['1', '2', '3'])
  expect(buttons.map(button => button.key)).toEqual([
    'arabic-mode-plain', 'arabic-mode-joined', 'arabic-mode-reversed',
  ])
  for (const mode of ARABIC_MODES) expect(await shown.find({ type: 'Text', text: terminalArabic('terminal', mode, sample) })).toBeDefined()
  expect(await shown.find({ type: 'Text', text: 'Press 1–3' })).toBeDefined()
  expect(await shown.find({ type: 'Text', text: 'engine band' })).toBeDefined()
  await shown.unmount()
})

for (const mode of ARABIC_MODES) {
  test(`choosing ${mode} saves it for this terminal and hides the survey`, { options: OPTIONS }, async ($, on) => {
    mock.env(on, { TERM_PROGRAM: 'WarpTerminal' })
    const stored: Record<string, unknown> = {}
    on('store.get', async (_$, e) => ({ value: stored[e.key] }))
    on('store.set', async (_$, e) => (stored[e.key] = e.value, { value: undefined }))
    const toasts: string[] = []
    on('ui.toast', async (_$, e) => (toasts.push(e.text), { value: undefined }))
    engineBand(on)
    install(on, readOptions(OPTIONS))
    const shown = await $.ui.mount(band('terminal'))
    await shown.press({ key: `arabic-mode-${mode}` })
    expect(stored.arabicTerminals).toEqual({ WarpTerminal: mode })
    expect(await shown.find(rows)).toBeUndefined()
    expect(toasts).toEqual(['muslim: Arabic for WarpTerminal set — /muslim terminal-arabic to redo'])
    await shown.unmount()
  })
}

test('Apple and Warp answers are independent; a new unanswered terminal gets its own survey', { options: OPTIONS }, async ($, on) => {
  let termId = 'Apple_Terminal'
  on('env.get', async (_$, e) => ({ value: e.name === 'TERM_PROGRAM' ? termId : undefined }))
  const stored: Record<string, unknown> = {}
  on('store.get', async (_$, e) => ({ value: stored[e.key] }))
  on('store.set', async (_$, e) => (stored[e.key] = e.value, { value: undefined }))
  engineBand(on)
  install(on, readOptions(OPTIONS))
  let shown = await $.ui.mount(band('terminal'))
  await shown.press({ key: 'arabic-mode-plain' })
  await shown.unmount()
  termId = 'WarpTerminal'
  shown = await $.ui.mount(band('terminal', false, 'warp'))
  expect(await shown.find(rows)).toBeDefined()
  expect(stored.arabicTerminals).toEqual({ Apple_Terminal: 'plain' })
  await shown.unmount()
})

test('desktop never draws the survey; command replies terminal-only there', { options: OPTIONS }, async ($, on) => {
  mock.env(on, { TERM_PROGRAM: 'Apple_Terminal' })
  mock.store(on)
  engineBand(on)
  install(on, readOptions(OPTIONS))
  on('session.surface', async () => ({ value: 'desktop' }))
  const desktop = await $.ui.mount(band('desktop'))
  expect(await desktop.find(rows)).toBeUndefined()
  await desktop.unmount()
  const reply = await $.command.run({ command: 'muslim', args: 'terminal-arabic', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(reply.text).toBe('The Arabic display check is available in the terminal only.')
})

test('terminal-arabic reopens the survey for an answered terminal', { options: OPTIONS }, async ($, on) => {
  mock.env(on, { TERM_PROGRAM: 'WarpTerminal' })
  mock.store(on, { arabicTerminals: { WarpTerminal: 'joined' } })
  engineBand(on)
  install(on, readOptions(OPTIONS))
  on('session.surface', async () => ({ value: 'terminal' }))
  const automatic = await $.ui.mount(band('terminal', false, 'already-answered'))
  expect(await automatic.find(rows)).toBeUndefined()
  await automatic.unmount()
  const reply = await $.command.run({ command: 'muslim', args: 'terminal-arabic', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(reply.text).toBe('Arabic display check opened.')
  const shown = await $.ui.mount(band('terminal', false, 'manual'))
  expect(await shown.find(rows)).toBeDefined()
  await shown.unmount()
})

test('survey remains visible after reload in the same unanswered terminal session', { options: OPTIONS }, async ($, on) => {
  mock.env(on, { TERM_PROGRAM: 'Apple_Terminal' })
  mock.store(on)
  engineBand(on)
  install(on, readOptions(OPTIONS))
  const shown = await $.ui.mount(band('terminal'))
  expect(await shown.find(rows)).toBeDefined()
  await shown.unmount()
})

test('an invalid saved mode reopens the survey', { options: OPTIONS }, async ($, on) => {
  mock.env(on, { TERM_PROGRAM: 'WarpTerminal' })
  mock.store(on, { arabicTerminals: { WarpTerminal: 'none' } })
  engineBand(on)
  install(on, readOptions(OPTIONS))
  const shown = await $.ui.mount(band('terminal'))
  expect(await shown.find(rows)).toBeDefined()
  await shown.unmount()
})

const status = { command: 'muslim', args: '', origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } }

test('/muslim status shows this terminal saved Arabic mode', { options: OPTIONS }, async ($, on) => {
  mock.env(on, { TERM_PROGRAM: 'WarpTerminal' })
  mock.store(on, { arabicTerminals: { WarpTerminal: 'reversed' } })
  on('session.surface', async () => ({ value: 'terminal' }))
  const text = (await $.command.run(status)).text
  expect(text).toContain('| Terminal Arabic | reversed for WarpTerminal | `/muslim terminal-arabic` |')
})

test('/muslim status shows the default when this terminal has no answer, and nothing on desktop', { options: OPTIONS }, async ($, on) => {
  mock.env(on, { TERM_PROGRAM: 'Apple_Terminal' })
  mock.store(on)
  let surface: 'terminal' | 'desktop' = 'terminal'
  on('session.surface', async () => ({ value: surface }))
  expect((await $.command.run(status)).text).toContain('| Terminal Arabic | plain (default, not chosen yet) for Apple_Terminal |')
  surface = 'desktop'
  expect((await $.command.run(status)).text).toContain('| Terminal Arabic | terminal only |')
})

for (const [color, expected] of [['orange', 'claude'], ['gold', '#c99a1f']] as const) {
  test(`terminal survey label follows ${color} without coloring the other text`, { options: { athkar: false, color } }, async ($, on) => {
    mock.env(on, {})
    mock.store(on)
    on('config.list', async () => ({ value: [{ key: 'theme', label: 'Theme', kind: 'choice', value: 'light', provider: { plugin: 'engine', tier: 'core' }, isLocked: false }] }))
    on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
      const { Box } = $.ui.resolve(e)
      return <Box />
    })
    const shown = await $.ui.mount({ plugin: 'muslim', surface: 'terminal', component: 'AbovePrompt', requestId: 'survey-colors', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} } })
    expect((await shown.find({ type: 'Text', text: 'muslim' }))?.props.color).toBe(expected)
    expect((await shown.find({ type: 'Text', text: 'Press 1–3' }))?.props.color).toBeUndefined()
    await shown.unmount()
  })
}

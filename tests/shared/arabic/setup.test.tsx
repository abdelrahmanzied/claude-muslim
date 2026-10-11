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
const OPTIONS = { thikr: false, tashkeel: true, salahShow: 'off', salahPlace: 'Munich, Germany; 48.14, 11.58; Europe/Berlin; DE' }
const sample = 'بِسْمِ اللَّهِ'
const rows = { type: 'Button' as const }

test('survey rows use fixed mode order and Text samples', { options: OPTIONS }, async ($, on) => {
  mock.env(on, { TERM_PROGRAM: 'Apple_Terminal' })
  mock.store(on)
  engineBand(on)
  install(on, readOptions(OPTIONS))
  const shown = await $.ui.mount(band('terminal'))
  const buttons = await shown.findAll(rows)
  expect(buttons.map(button => button.props.hotkey)).toEqual(['1', '2', '3', '4'])
  expect(buttons.map(button => button.key)).toEqual([
    'arabic-mode-none', 'arabic-mode-plain', 'arabic-mode-joined', 'arabic-mode-reversed',
  ])
  for (const mode of ARABIC_MODES) expect(await shown.find({ type: 'Text', text: terminalArabic('terminal', mode, sample) })).toBeDefined()
  expect(await shown.find({ type: 'Text', text: 'Press 1–4' })).toBeDefined()
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

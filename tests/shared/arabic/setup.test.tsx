import { mock, test, expect } from 'claude-code/testing'
import type { On } from 'claude-code'
import type { Options } from '../../../src/config.ts'
import { install } from '../../../src/shared/arabic/install.tsx'
import { arabicVisual } from '../../../src/shared/arabic/visual.ts'

const band = (surface: 'terminal' | 'desktop', hasSurvey = false, requestId = 'arabic-check') => ({
  plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId,
  props: { hasSurvey, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} },
})
const engineBand = (on: On) => on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
  const { Text } = $.ui.resolve(e)
  return <Text key="engine-band">engine band</Text>
})
const store = (on: On) => {
  const values: Record<string, unknown> = {}
  on('store.get', async (_$, e) => ({ value: values[e.key] }))
  on('store.set', async (_$, e) => (values[e.key] = e.value, { value: undefined }))
  return values
}
const sessionId = (on: On, initial = 'session-1') => {
  let id = initial
  on('session.id', async () => ({ value: id }))
  return (next: string) => { id = next }
}
const OPTIONS = { thikr: false } as Options
const buttons = { type: 'Button' as const }

for (const [program, expected] of [
  ['Apple_Terminal', [arabicVisual('سلام'), 'سلام', 'Not now']],
  ['WarpTerminal', ['سلام', arabicVisual('سلام'), 'Not now']],
  ['unknown', ['سلام', arabicVisual('سلام'), 'Not now']],
] as const) {
  test(`${program}: first terminal render shows survey rows in likely-first order`, { options: OPTIONS }, async ($, on) => {
    mock.env(on, { TERM_PROGRAM: program })
    const stored = store(on)
    sessionId(on)
    engineBand(on)
    install(on, OPTIONS)
    const shown = await $.ui.mount(band('terminal'))
    const rows = await shown.findAll(buttons)
    expect(rows.map(row => (row.props as { hotkey?: string }).hotkey)).toEqual(['1', '2', '3'])
    expect(rows.map(row => row.key)).toEqual(expected[2] === 'Not now'
      ? (expected[0] === arabicVisual('سلام') ? ['arabic-fix-on', 'arabic-fix-off', 'arabic-fix-keep'] : ['arabic-fix-off', 'arabic-fix-on', 'arabic-fix-keep'])
      : [])
    expect(await shown.find({ type: 'Text', text: expected[0] })).toBeDefined()
    expect(await shown.find({ type: 'Text', text: expected[1] })).toBeDefined()
    expect(await shown.find({ type: 'Button', key: 'arabic-fix-keep' })).toBeDefined()
    expect(await shown.find({ type: 'Text', text: 'muslim' })).toBeDefined()
    expect(await shown.find({ type: 'Text', text: 'Press 1, 2 or 3' })).toBeDefined()
    expect(stored.arabicFixShownIn).toBe('session-1')
    expect(await shown.find({ type: 'Text', text: 'engine band' })).toBeDefined()
    await shown.unmount()
  })
}

for (const [value, mode] of [['on', 'on'], ['off', 'off'], ['keep', 'auto']] as const) {
  test(`hotkey ${value} applies the mode and hides the picker`, { options: OPTIONS }, async ($, on) => {
    mock.env(on, { TERM_PROGRAM: 'WarpTerminal' })
    const stored = store(on)
    sessionId(on)
    engineBand(on)
    const writes: unknown[] = []
    on('config.set', async (_$, e) => (writes.push({ key: e.key, value: e.value }), { value: e.value }))
    const toasts: string[] = []
    on('ui.toast', async (_$, e) => (toasts.push(e.text), { value: undefined }))
    install(on, OPTIONS)
    const shown = await $.ui.mount(band('terminal'))
    await shown.press({ key: `arabic-fix-${value}` })
    expect(await shown.find({ type: 'Button', key: 'arabic-fix-on' })).toBeUndefined()
    expect(stored.arabicFixShownIn).toBe('done')
    expect(writes).toEqual(mode === 'auto' ? [] : [{ key: 'muslim.arabicFix', value: mode }])
    expect(toasts).toEqual([`muslim: Arabic fix ${mode} — run /muslim terminal-arabic to check again`])
    await shown.unmount()
  })
}

test('desktop and surveys never draw or consume the first-run picker', { options: OPTIONS }, async ($, on) => {
  mock.env(on, { TERM_PROGRAM: 'Apple_Terminal' })
  const stored = store(on)
  sessionId(on)
  engineBand(on)
  install(on, OPTIONS)
  for (const target of [band('desktop'), band('terminal', true)]) {
    const view = await $.ui.mount(target)
    expect(await view.find(buttons)).toBeUndefined()
    await view.unmount()
  }
  expect(stored.arabicFixShownIn).toBeUndefined()
})

test('later session never gets the automatic picker', { options: OPTIONS }, async ($, on) => {
  mock.env(on, { TERM_PROGRAM: 'Apple_Terminal' })
  const stored = store(on)
  sessionId(on, 'session-2')
  stored.arabicFixShownIn = 'session-1'
  engineBand(on)
  install(on, OPTIONS)
  const later = await $.ui.mount(band('terminal'))
  expect(await later.find(buttons)).toBeUndefined()
  expect(stored.arabicFixShownIn).toBe('session-1')
  await later.unmount()
})

test('session marker keeps an unanswered first-run picker visible after reload', { options: OPTIONS }, async ($, on) => {
  mock.env(on, { TERM_PROGRAM: 'Apple_Terminal' })
  const stored = store(on)
  stored.arabicFixShownIn = 'session-1'
  sessionId(on)
  engineBand(on)
  install(on, OPTIONS)
  const afterReload = await $.ui.mount(band('terminal'))
  expect(await afterReload.find(buttons)).toBeDefined()
  await afterReload.unmount()
})

test('terminal-arabic command reopens picker without resetting the first-run marker', { options: OPTIONS }, async ($, on) => {
  mock.env(on, { TERM_PROGRAM: 'WarpTerminal' })
  const stored = store(on)
  stored.arabicFixShownIn = 'done'
  sessionId(on)
  engineBand(on)
  install(on, OPTIONS)
  on('session.surface', async () => ({ value: 'terminal' }))
  const command = await $.command.run({ command: 'muslim', args: 'terminal-arabic', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(command.text).toBe('Arabic display check opened.')
  const reopened = await $.ui.mount(band('terminal', false, 'manual-picker'))
  expect(await reopened.find(buttons)).toBeDefined()
  expect(stored.arabicFixShownIn).toBe('done')
  await reopened.unmount()
})

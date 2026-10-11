import type { On } from 'claude-code'
import type { Options } from '../../../src/config.ts'
import { expect, mock, test } from 'claude-code/testing'
import { ARABIC_SAMPLE, install } from '../../../src/shared/arabic/install.tsx'
import { arabicVisual } from '../../../src/shared/arabic/visual.ts'

const band = (surface: 'terminal' | 'desktop', hasSurvey = false) => ({
  plugin: 'muslim', surface, component: 'AbovePrompt' as const, requestId: 'arabic-check',
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
const sessionId = (on: On) => {
  let id = 'session-1'
  on('session.id', async () => ({ value: id }))
  return (next: string) => { id = next }
}
const OPTIONS = { thikr: false }

for (const program of ['Apple_Terminal', 'WarpTerminal', 'unknown']) {
  test(`${program}: first run asks in auto, with the likely button first`, { options: OPTIONS }, async ($, on) => {
    mock.env(on, { TERM_PROGRAM: program })
    const stored = store(on)
    sessionId(on)
    engineBand(on)
    const shown = await $.ui.mount(band('terminal'))
    expect(stored.arabicFixShownIn).toBe('session-1')
    expect(await shown.find({ type: 'Text', text: 'muslim' })).toBeDefined()
    expect(await shown.find({ type: 'Text', text: ' · Which Arabic word reads correctly here?' })).toBeDefined()
    expect(await shown.find({ type: 'Button', key: 'arabic-fix-off', text: ARABIC_SAMPLE })).toBeDefined()
    expect(await shown.find({ type: 'Button', key: 'arabic-fix-on', text: arabicVisual(ARABIC_SAMPLE) })).toBeDefined()
    expect(await shown.find({ type: 'Button', key: 'arabic-fix-later', text: 'Not now' })).toBeDefined()
    expect(await shown.find({ type: 'Text', text: 'engine band' })).toBeDefined()
    const tree = JSON.stringify(await shown.drawn())
    expect(tree.indexOf('arabic-fix-on') < tree.indexOf('arabic-fix-off')).toBe(program === 'Apple_Terminal')
    await shown.unmount()
  })
}

test('still shows after module reload in the same session', { options: OPTIONS }, async ($, on) => {
  mock.env(on, {})
  mock.store(on, { arabicFixShownIn: 'session-1' })
  sessionId(on)
  engineBand(on)
  // The test kit has no reload operation. Seed the store as the previous module
  // left it, then register the fresh module closure before its first dispatch.
  install(on, OPTIONS as Options)
  const afterReload = await $.ui.mount(band('terminal'))
  expect(await afterReload.find({ key: 'arabic-fix-check' })).toBeDefined()
  await afterReload.unmount()
})

test('a new session id hides a check already shown in the prior session', { options: OPTIONS }, async ($, on) => {
  mock.env(on, {})
  const stored = store(on)
  const setSession = sessionId(on)
  engineBand(on)
  const first = await $.ui.mount(band('terminal'))
  expect(await first.find({ key: 'arabic-fix-check' })).toBeDefined()
  await first.unmount()
  setSession('session-2')
  const next = await $.ui.mount(band('terminal'))
  expect(stored.arabicFixShownIn).toBe('session-1')
  expect(await next.find({ key: 'arabic-fix-check' })).toBeUndefined()
  expect(await next.find({ type: 'Text', text: 'engine band' })).toBeDefined()
  await next.unmount()
})

for (const choice of ['off', 'on', 'later'] as const) {
  test(`${choice}: hide after a press and confirm the mode`, { options: OPTIONS }, async ($, on) => {
    mock.env(on, { TERM_PROGRAM: 'Apple_Terminal' })
    const stored = store(on)
    sessionId(on)
    engineBand(on)
    const toasts: string[] = []
    on('ui.toast', async (_$, e) => (toasts.push(e.text), { value: undefined }))
    const writes: unknown[] = []
    on('config.set', async (_$, e) => (writes.push({ key: e.key, value: e.value }), { value: e.value }))
    const shown = await $.ui.mount(band('terminal'))
    await shown.press({ key: `arabic-fix-${choice}` })
    expect(stored.arabicFixShownIn).toBe('done')
    expect(toasts).toEqual([`muslim: Arabic fix ${choice === 'later' ? 'auto' : choice} — change with /muslim arabic-fix`])
    expect(writes).toEqual(choice === 'later' ? [] : [{ key: 'muslim.arabicFix', value: choice }])
    expect(await shown.find({ key: 'arabic-fix-check' })).toBeUndefined()
    await shown.unmount()
  })
}

test('desktop and surveys do not ask or consume the first-run check', { options: OPTIONS }, async ($, on) => {
  engineBand(on)
  let reads = 0
  const writes: unknown[] = []
  on('store.set', async (_$, e) => (writes.push(e.value), { value: undefined }))
  on('store.get', async () => (reads++, { value: undefined }))
  on('session.id', async () => (reads++, { value: 'session-1' }))
  on('env.get', async () => (reads++, { value: 'WarpTerminal' }))
  for (const target of [band('desktop'), band('terminal', true)]) {
    const shown = await $.ui.mount(target)
    expect(await shown.find({ key: 'arabic-fix-check' })).toBeUndefined()
    expect(await shown.find({ type: 'Text', text: 'engine band' })).toBeDefined()
    await shown.unmount()
  }
  expect(reads).toBe(0)
  expect(writes).toEqual([])
})

test('a denied setting hides the check and explains how to change it', { options: OPTIONS }, async ($, on) => {
  mock.env(on, {})
  const stored = store(on)
  sessionId(on)
  engineBand(on)
  const toasts: string[] = []
  on('config.set', async () => ({ deny: 'test refusal' }))
  on('ui.toast', async (_$, e) => (toasts.push(e.text), { value: undefined }))
  const shown = await $.ui.mount(band('terminal'))
  await shown.press({ key: 'arabic-fix-on' })
  expect(stored.arabicFixShownIn).toBe('done')
  expect(await shown.find({ key: 'arabic-fix-check' })).toBeUndefined()
  expect(toasts).toEqual(['muslim: Not changed: test refusal — change with /muslim arabic-fix'])
  await shown.unmount()
})

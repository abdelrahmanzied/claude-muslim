import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import { ARABIC_SAMPLE } from '../../../src/shared/arabic/install.tsx'
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
const OPTIONS = { thikr: false }

for (const program of ['Apple_Terminal', 'WarpTerminal', 'unknown']) {
  test(`${program}: first run asks even in auto, with the likely button first`, { options: OPTIONS }, async ($, on) => {
    mock.env(on, { TERM_PROGRAM: program })
    mock.store(on, {})
    engineBand(on)
    const shown = await $.ui.mount(band('terminal'))
    expect(await shown.find({ type: 'Text', text: `1 ${ARABIC_SAMPLE}` })).toBeDefined()
    expect(await shown.find({ type: 'Text', text: `2 ${arabicVisual(ARABIC_SAMPLE)}` })).toBeDefined()
    expect(await shown.find({ type: 'Text', text: 'engine band' })).toBeDefined()
    const tree = JSON.stringify(await shown.drawn())
    expect(tree.indexOf('arabic-fix-on') < tree.indexOf('arabic-fix-off')).toBe(program === 'Apple_Terminal')
    await shown.redraw()
    expect(await shown.find({ key: 'arabic-fix-check' })).toBeDefined()
    await shown.unmount()
  })
}

for (const choice of ['off', 'on', 'later'] as const) {
  test(`${choice}: persist the answer once and hide the row across mounts`, { options: OPTIONS }, async ($, on) => {
    mock.env(on, { TERM_PROGRAM: 'Apple_Terminal' })
    const stored = store(on)
    engineBand(on)
    const writes: unknown[] = []
    on('config.set', async (_$, e) => (writes.push({ key: e.key, value: e.value }), { value: e.value }))
    let ignoreSession = false
    on('state.get', { plugin: 'muslim', key: 'arabicFixAnswered' }, async (_$, e, next) =>
      ignoreSession ? { value: { value: false, version: 0 } } : next(e))
    const shown = await $.ui.mount(band('terminal'))
    await shown.press({ key: `arabic-fix-${choice}` })
    expect(stored.arabicFixAnswered).toBe(true)
    expect(writes).toEqual(choice === 'later' ? [] : [{ key: 'muslim.arabicFix', value: choice }])
    expect(await shown.find({ key: 'arabic-fix-check' })).toBeUndefined()
    expect(await shown.find({ type: 'Text', text: 'engine band' })).toBeDefined()
    await shown.unmount()
    // Ignore the session mark to stand for a fresh session on the same machine.
    ignoreSession = true
    const again = await $.ui.mount(band('terminal'))
    expect(await again.find({ key: 'arabic-fix-check' })).toBeUndefined()
    await again.unmount()
  })
}

test('a stored answer skips the check before terminal detection', { options: OPTIONS }, async ($, on) => {
  mock.store(on, { arabicFixAnswered: true })
  engineBand(on)
  const shown = await $.ui.mount(band('terminal'))
  expect(await shown.find({ key: 'arabic-fix-check' })).toBeUndefined()
  expect(await shown.find({ type: 'Text', text: 'engine band' })).toBeDefined()
  await shown.unmount()
})

test('desktop and surveys do not ask or consume the first-run check', { options: OPTIONS }, async ($, on) => {
  engineBand(on)
  let reads = 0
  on('store.get', async () => (reads++, { value: undefined }))
  on('env.get', async () => (reads++, { value: 'WarpTerminal' }))
  for (const target of [band('desktop'), band('terminal', true)]) {
    const shown = await $.ui.mount(target)
    expect(await shown.find({ key: 'arabic-fix-check' })).toBeUndefined()
    expect(await shown.find({ type: 'Text', text: 'engine band' })).toBeDefined()
    await shown.unmount()
  }
  expect(reads).toBe(0)
  const shown = await $.ui.mount(band('terminal'))
  expect(await shown.find({ key: 'arabic-fix-check' })).toBeDefined()
  await shown.unmount()
})

test('a denied setting keeps the row unanswered and allows Later', { options: OPTIONS }, async ($, on) => {
  mock.env(on, {})
  const stored = store(on)
  engineBand(on)
  const toasts: string[] = []
  on('config.set', async () => ({ deny: 'test refusal' }))
  on('ui.toast', async (_$, e) => (toasts.push(e.text), { value: undefined }))
  const shown = await $.ui.mount(band('terminal'))
  await shown.press({ key: 'arabic-fix-on' })
  expect(stored.arabicFixAnswered).toBeUndefined()
  expect(await shown.find({ key: 'arabic-fix-check' })).toBeDefined()
  expect(toasts).toEqual(['Not changed: test refusal'])
  await shown.press({ key: 'arabic-fix-later' })
  expect(stored.arabicFixAnswered).toBe(true)
  expect(await shown.find({ key: 'arabic-fix-check' })).toBeUndefined()
  await shown.unmount()
})

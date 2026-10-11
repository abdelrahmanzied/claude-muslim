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
    const stored = store(on)
    engineBand(on)
    const shown = await $.ui.mount(band('terminal'))
    expect(stored.arabicFixAnswered).toBe(true)
    expect(await shown.find({ type: 'Text', text: 'muslim' })).toBeDefined()
    expect(await shown.find({ type: 'Text', text: ' · Which Arabic word reads correctly here?' })).toBeDefined()
    expect(await shown.find({ type: 'Button', key: 'arabic-fix-off', text: ARABIC_SAMPLE })).toBeDefined()
    expect(await shown.find({ type: 'Button', key: 'arabic-fix-on', text: arabicVisual(ARABIC_SAMPLE) })).toBeDefined()
    expect(await shown.find({ type: 'Button', key: 'arabic-fix-later', text: 'Not now' })).toBeDefined()
    expect(await shown.find({ type: 'Text', text: 'engine band' })).toBeDefined()
    const tree = JSON.stringify(await shown.drawn())
    expect(tree.indexOf('arabic-fix-on') < tree.indexOf('arabic-fix-off')).toBe(program === 'Apple_Terminal')
    await shown.redraw()
    expect(await shown.find({ key: 'arabic-fix-check' })).toBeDefined()
    await shown.unmount()
  })
}

for (const choice of ['off', 'on', 'later'] as const) {
  test(`${choice}: hide after a press and confirm the mode`, { options: OPTIONS }, async ($, on) => {
    mock.env(on, { TERM_PROGRAM: 'Apple_Terminal' })
    const clock = mock.clock(on, { now: 0 })
    const stored = store(on)
    engineBand(on)
    const toasts: string[] = []
    on('ui.toast', async (_$, e) => (toasts.push(e.text), { value: undefined }))
    const writes: unknown[] = []
    on('config.set', async (_$, e) => (writes.push({ key: e.key, value: e.value }), { value: e.value }))
    let ignoreSession = false
    on('state.get', { plugin: 'muslim', key: 'arabicFixShown' }, async (_$, e, next) =>
      ignoreSession ? { value: { value: false, version: 0 } } : next(e))
    const shown = await $.ui.mount(band('terminal'))
    await clock.advance(0)
    await shown.press({ key: `arabic-fix-${choice}` })
    expect(stored.arabicFixAnswered).toBe(true)
    expect(toasts).toEqual([`muslim: Arabic fix ${choice === 'later' ? 'auto' : choice} — change with /muslim arabic-fix`])
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
  const writes: unknown[] = []
  on('store.set', async (_$, e) => (writes.push(e.value), { value: undefined }))
  on('store.get', async () => (reads++, { value: undefined }))
  on('env.get', async () => (reads++, { value: 'WarpTerminal' }))
  for (const target of [band('desktop'), band('terminal', true)]) {
    const shown = await $.ui.mount(target)
    expect(await shown.find({ key: 'arabic-fix-check' })).toBeUndefined()
    expect(await shown.find({ type: 'Text', text: 'engine band' })).toBeDefined()
    await shown.unmount()
  }
  expect(reads).toBe(0)
  expect(writes).toEqual([])
  const shown = await $.ui.mount(band('terminal'))
  expect(await shown.find({ key: 'arabic-fix-check' })).toBeDefined()
  await shown.unmount()
})

test('a denied setting also hides the check and explains how to change it', { options: OPTIONS }, async ($, on) => {
  mock.env(on, {})
  const stored = store(on)
  engineBand(on)
  const toasts: string[] = []
  on('config.set', async () => ({ deny: 'test refusal' }))
  on('ui.toast', async (_$, e) => (toasts.push(e.text), { value: undefined }))
  const shown = await $.ui.mount(band('terminal'))
  await shown.press({ key: 'arabic-fix-on' })
  expect(stored.arabicFixAnswered).toBe(true)
  expect(await shown.find({ key: 'arabic-fix-check' })).toBeUndefined()
  expect(toasts).toEqual(['muslim: Not changed: test refusal — change with /muslim arabic-fix'])
  await shown.unmount()
})

test('shown without an answer never asks in a new session', { options: OPTIONS }, async ($, on) => {
  mock.env(on, {})
  const clock = mock.clock(on, { now: 0 })
  const stored = store(on)
  engineBand(on)
  let freshSession = false
  on('state.get', { plugin: 'muslim', key: 'arabicFixShown' }, async (_$, e, next) =>
    freshSession ? { value: { value: false, version: 0 } } : next(e))
  const shown = await $.ui.mount(band('terminal'))
  expect(stored.arabicFixAnswered).toBe(true)
  await shown.redraw()
  expect(await shown.find({ key: 'arabic-fix-check' })).toBeDefined()
  await shown.unmount()
  const sameSession = await $.ui.mount(band('terminal'))
  expect(await sameSession.find({ key: 'arabic-fix-check' })).toBeDefined()
  await sameSession.unmount()
  await clock.advance(0)
  freshSession = true
  const nextSession = await $.ui.mount(band('terminal'))
  expect(await nextSession.find({ key: 'arabic-fix-check' })).toBeUndefined()
  expect(await nextSession.find({ type: 'Text', text: 'engine band' })).toBeDefined()
  await nextSession.unmount()
})

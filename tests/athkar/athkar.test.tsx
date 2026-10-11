import type { JsonValue, On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { listFor, TITLE } from '../../src/features/athkar/logic.ts'

const SURFACES = ['terminal', 'desktop'] as const

// The engine's own band, beneath the plugin.
const engineBand = (on: On) => {
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
  on('config.list', async () => ({ value: [] }))
}

const band = (surface: (typeof SURFACES)[number]) => ({
  plugin: 'muslim',
  surface,
  component: 'AbovePrompt' as const,
  requestId: 'band',
  props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} },
})

const MORNING = new Date(2026, 9, 10, 7, 0).getTime()

type Ui = {
  find: (q: Record<string, unknown>) => Promise<{ props: Record<string, unknown> } | undefined>
  post: (data: JsonValue) => Promise<void>
}

// The desktop band is a picture; the terminal's is text.
const picture = async (ui: Ui) => String((await ui.find({ in: 'athkar', type: 'Svg' }))?.props.source ?? '')

// The first thikr is said once: the pill on the progress line's head shows ١, then ٠ once counted.
const isFirstCounted = async (ui: Ui, surface: (typeof SURFACES)[number]) =>
  surface === 'desktop'
    ? /<span class="pill"[^>]*>٠<\/span>/.test(await picture(ui))
    : (await ui.find({ in: 'athkar', text: /^ ٠ $/ })) !== undefined

const isCover = async (ui: Ui, surface: (typeof SURFACES)[number]) =>
  surface === 'desktop' ? /class="(cover cv-inline|peek cv-peek)"/.test(await picture(ui)) : (await ui.find({ in: 'athkar', text: TITLE.morning })) !== undefined

const press = (ui: Ui, key: string) => ui.post({ act: 'key', key })

test('the cover folds when faded, opens on a click that does not count, then starts, then clicks count', async ($, on) => {
  mock.clock(on, { now: MORNING })
  mock.store(on)
  engineBand(on)

  for (const surface of SURFACES) {
    await $.command.run({ command: 'athkar', args: 'morning reset', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
    const ui = await $.ui.mount(band(surface))
    expect(await isCover(ui, surface)).toBe(true)

    // Faded, the cover is one slim row; the first click only opens it.
    const heightOf = async () => Number((await ui.find({ in: 'athkar', type: 'Svg' }))?.props.height ?? 0)
    const isFoldedCover = async () => (surface === 'desktop' ? (await picture(ui)).includes('class="peek cv-peek"') : (await ui.find({ in: 'athkar', key: 'rest' })) !== undefined)
    expect(await isFoldedCover()).toBe(true)
    const slim = await heightOf()
    await ui.pointer({ type: 'down', x: 40, y: 0, button: 'left' })
    expect(await isFoldedCover()).toBe(false)
    expect(await isCover(ui, surface)).toBe(true)
    expect(await isFirstCounted(ui, surface)).toBe(false)
    if (surface === 'desktop') expect(await heightOf()).toBeGreaterThan(slim)

    // The next one starts the reading, still without counting.
    await ui.pointer({ type: 'down', x: 40, y: 1, button: 'left' })
    expect(await isCover(ui, surface)).toBe(false)
    expect(await isFirstCounted(ui, surface)).toBe(false)

    await ui.pointer({ type: 'down', x: 40, y: 1, button: 'left' })
    expect(await isFirstCounted(ui, surface)).toBe(true)
    await ui.pointer({ type: 'down', x: 40, y: 1, button: 'right' })
    expect(await isFirstCounted(ui, surface)).toBe(false)
    await ui.unmount()
  }
})

test('the desktop band draws in Tajawal at the slot width', async ($, on) => {
  mock.clock(on, { now: MORNING })
  mock.store(on)
  engineBand(on)
  const ui = await $.ui.mount(band('desktop'))
  const svg = await ui.find({ in: 'athkar', type: 'Svg' })
  expect(String(svg?.props.source)).toContain('font-family: "Tajawal"')
  // Over the desktop's card the desktop narrows it to the slot; it stretches to fill.
  expect(svg?.props.width).toBe(857)
  expect(String(svg?.props.source).split('>')[0]).toContain('preserveAspectRatio="none"')
  expect(await ui.find({ type: 'Client' })).toBeDefined()
  await ui.unmount()
})

test('the reader moves on by itself after the last count', async ($, on) => {
  const clock = mock.clock(on, { now: MORNING })
  mock.store(on)
  engineBand(on)
  const ui = await $.ui.mount(band('terminal'))
  // The first press wakes the folded cover, the next starts the reading.
  await press(ui, 'return')
  await press(ui, 'return')

  await press(ui, 'space')
  await clock.advance(700)
  expect(await ui.find({ in: 'athkar', text: /٢ مِنْ/ })).toBeDefined()
  await ui.unmount()
})

test('finishing shows the end, and × hides the band keeping the reading', async ($, on) => {
  mock.clock(on, { now: MORNING })
  mock.store(on)
  engineBand(on)
  const ui = await $.ui.mount(band('desktop'))
  await press(ui, 'return')
  await press(ui, 'return')
  const list = listFor('morning')
  for (let i = 0; i < list.length; i++) {
    const thikr = list[i]!
    for (let n = 0; n < thikr.times; n++) await press(ui, 'return')
    await press(ui, 'left')
  }
  // Finished in front of the person: the finale plays, tall, with the dua rising.
  const finale = String(await picture(ui))
  expect(finale).toContain('class="rise-msg"')
  expect(finale).toContain('class="fall"')

  await ui.post({ act: 'hide' })
  expect(await ui.find({ type: 'Client' })).toBeUndefined()
  const status = await $.command.run({ command: 'athkar', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(status.text).toContain('morning done ✓')
  await ui.unmount()
})

test('/athkar shows status and brings a hidden band back', async ($, on) => {
  mock.clock(on, { now: MORNING })
  mock.store(on)
  engineBand(on)
  const ui = await $.ui.mount(band('terminal'))
  await ui.post({ act: 'hide' })
  const ran = await $.command.run({ command: 'athkar', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(ran.text).toContain('athkar on · style sky · color orange')
  expect(await ui.find({ in: 'athkar', text: TITLE.morning })).toBeDefined()
  await ui.unmount()
})

test('off draws nothing above the prompt', { options: { athkar: false } }, async ($, on) => {
  mock.clock(on, { now: MORNING })
  mock.store(on)
  engineBand(on)
  const ui = await $.ui.mount(band('terminal'))
  expect(await ui.find({ type: 'Client' })).toBeUndefined()
  await ui.unmount()
})

test('faded, the reading folds to one row; a press opens it without counting', async ($, on) => {
  const clock = mock.clock(on, { now: MORNING })
  mock.store(on)
  engineBand(on)

  for (const surface of SURFACES) {
    await $.command.run({ command: 'athkar', args: 'morning reset', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
    const ui = await $.ui.mount(band(surface))
    // Wake the cover, then start the reading.
    await ui.pointer({ type: 'down', x: 40, y: 1, button: 'left' })
    await ui.pointer({ type: 'down', x: 40, y: 1, button: 'left' })
    const heightOf = async () => Number((await ui.find({ in: 'athkar', type: 'Svg' }))?.props.height ?? 0)
    const isFolded = async () => (surface === 'desktop' ? (await picture(ui)).includes('class="peek"') : (await ui.find({ in: 'athkar', key: 'rest' })) !== undefined)

    // Lit: the full reading, with the pill on the line.
    expect(await isFolded()).toBe(false)
    const full = await heightOf()

    // The pointer leaves: it fades and folds.
    await ui.post({ act: 'leave' })
    // Not at once: a second of grace.
    await clock.advance(500)
    expect(await isFolded()).toBe(false)
    await clock.advance(600)
    expect(await isFolded()).toBe(true)
    if (surface === 'desktop') {
      expect(await heightOf()).toBeLessThan(full / 2)
      expect(await picture(ui)).not.toContain('class="pill"')
    }

    // A press opens it at once and does not count.
    await ui.pointer({ type: 'down', x: 40, y: 0, button: 'left' })
    expect(await isFolded()).toBe(false)
    expect(await isFirstCounted(ui, surface)).toBe(false)
    if (surface === 'desktop') expect(await heightOf()).toBe(full)

    // The next one counts.
    await ui.pointer({ type: 'down', x: 40, y: 1, button: 'left' })
    expect(await isFirstCounted(ui, surface)).toBe(true)
    await ui.unmount()
  }
})

test('counting by keys with the pointer off the band: it folds 3 seconds after the last key', async ($, on) => {
  const clock = mock.clock(on, { now: MORNING })
  mock.store(on)
  engineBand(on)
  await $.command.run({ command: 'athkar', args: 'morning reset', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  const ui = await $.ui.mount(band('terminal'))
  const isFolded = async () => (await ui.find({ in: 'athkar', key: 'rest' })) !== undefined
  await press(ui, 'return')
  await press(ui, 'return')
  await press(ui, 'space')
  // Each key starts the 3 seconds again.
  await clock.advance(2000)
  await press(ui, 'space')
  await clock.advance(2000)
  expect(await isFolded()).toBe(false)
  await clock.advance(1100)
  expect(await isFolded()).toBe(true)
  await ui.unmount()
})

test('counting by keys with the pointer on the band: it stays open', async ($, on) => {
  const clock = mock.clock(on, { now: MORNING })
  mock.store(on)
  engineBand(on)
  await $.command.run({ command: 'athkar', args: 'morning reset', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  const ui = await $.ui.mount(band('terminal'))
  const isFolded = async () => (await ui.find({ in: 'athkar', key: 'rest' })) !== undefined
  await ui.post({ act: 'enter' })
  await press(ui, 'return')
  await press(ui, 'return')
  await press(ui, 'space')
  await clock.advance(10_000)
  expect(await isFolded()).toBe(false)
  // The pointer leaves: a second later it folds.
  await ui.post({ act: 'leave' })
  await clock.advance(1100)
  expect(await isFolded()).toBe(true)
  await ui.unmount()
})

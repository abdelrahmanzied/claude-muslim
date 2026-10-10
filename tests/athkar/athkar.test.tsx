import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { END, listFor, TITLE } from '../../src/features/athkar/logic.ts'

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

// The first circle is filled once counted.
const isFirstCounted = async (ui: { find: (q: { in: string; key: string }) => Promise<{ props: Record<string, unknown> } | undefined> }) =>
  (await ui.find({ in: 'athkar', key: 'c0' }))?.props.backgroundColor !== undefined

test('the cover opens on a click that does not count, then clicks count', async ($, on) => {
  mock.clock(on, { now: MORNING })
  mock.store(on)
  engineBand(on)

  for (const surface of SURFACES) {
    await $.command.run({ command: 'athkar', args: 'morning reset', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
    const ui = await $.ui.mount(band(surface))
    expect(await ui.find({ in: 'athkar', text: TITLE.morning })).toBeDefined()

    await ui.pointer({ type: 'down', x: 5, y: 1, button: 'left' })
    expect(await ui.find({ in: 'athkar', text: TITLE.morning })).toBeUndefined()
    expect(await isFirstCounted(ui)).toBe(false)

    await ui.pointer({ type: 'down', x: 5, y: 1, button: 'left' })
    expect(await isFirstCounted(ui)).toBe(true)
    await ui.unmount()
  }
})

test('the reader moves on by itself after the last count', async ($, on) => {
  const clock = mock.clock(on, { now: MORNING })
  mock.store(on)
  engineBand(on)
  const ui = await $.ui.mount(band('terminal'))
  await ui.pointer({ type: 'down', x: 5, y: 1, button: 'left' })

  await ui.post({ act: 'count' })
  await clock.advance(700)
  expect(await ui.find({ in: 'athkar', text: /٢ مِنْ/ })).toBeDefined()
  await ui.unmount()
})

test('finishing shows the end, and × hides the band keeping the reading', async ($, on) => {
  mock.clock(on, { now: MORNING })
  mock.store(on)
  engineBand(on)
  const ui = await $.ui.mount(band('desktop'))
  const list = listFor('morning')
  for (let i = 0; i < list.length; i++) {
    const thikr = list[i]!
    for (let n = 0; n < thikr.times; n++) await ui.post({ act: 'count' })
    await ui.post({ act: 'next' })
  }
  expect(await ui.find({ in: 'athkar', text: END })).toBeDefined()

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

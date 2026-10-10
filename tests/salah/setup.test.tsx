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

test('before setup the band asks for the place; Not now puts it off for good', async ($, on) => {
  engineBand(on)
  // Stands for the plugin's store.
  const stored: Record<string, unknown> = {}
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

test('another city: typed in any language, found by Claude, saved', async ($, on) => {
  engineBand(on)
  const written = settingsWriter(on)
  answerDialog(on, 'ميونخ')
  answerCities(on, [MUNICH])

  const shown = await $.ui.mount(band('desktop'))
  await shown.press({ key: 'salah-city' })
  await shown.unmount()

  expect(written).toEqual([{ key: 'muslim.salahPlace', value: 'Munich, Germany; 48.14, 11.58; Europe/Berlin; DE' }])
})

test('/salah setup asks the same question', async ($, on) => {
  const written = settingsWriter(on)
  answerDialog(on, 'Munich')
  answerCities(on, [MUNICH])

  const ran = await $.command.run({ command: 'salah', args: 'setup', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })

  expect(ran.text).toBe('Munich, Germany · Muslim World League')
  expect(written[0]?.value).toBe('Munich, Germany; 48.14, 11.58; Europe/Berlin; DE')
})

test('a saved place shows no setup band', { options: { salahPlace: 'Munich, Germany; 48.14, 11.58; Europe/Berlin; DE' } }, async ($, on) => {
  engineBand(on)
  const shown = await $.ui.mount(band('terminal'))

  expect(await shown.find({ type: 'Button', key: 'salah-city' })).toBeUndefined()
  await shown.unmount()
})

const AT_MUNICH = { salahPlace: 'Munich, Germany; 48.1372, 11.5755; Europe/Berlin; DE' }
const statusLines = (on: On) => {
  const lines: (string | undefined)[] = []
  on('ui.status', async (_$, e) => (lines.push(e.text), { value: undefined }))

  return lines
}

test('/salah adjust opens the review form: minutes move a prayer, Save keeps them', { options: AT_MUNICH }, async ($, on) => {
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

test('always: the status line shows the next prayer, counts down, and notifies once', { options: { ...AT_MUNICH, salah: 'always' } }, async ($, on) => {
  // 13:30 in Munich on 10 October 2026; Asr is at 15:59.
  const clock = mock.clock(on, { now: Date.parse('2026-10-10T11:30:00Z') })
  engineBand(on)
  const lines: (string | undefined)[] = []
  const notes: string[] = []
  on('ui.status', async (_$, e) => (lines.push(e.text), { value: undefined }))
  on('ui.notify', async (_$, e) => (notes.push(e.text), { value: { isSent: true as const, channel: 'terminal' } }) as never)

  const shown = await $.ui.mount(band('terminal'))
  expect(lines.at(-1)).toBe('☾ العصر ١٥:٥٩')

  // 15:39: twenty minutes before Asr, then on to Asr itself.
  await clock.advance(129 * 60_000)
  expect(lines.at(-1)).toBe('☾ العصر بعد ٢٠ دقيقة')
  await clock.advance(20 * 60_000 + 30_000)
  expect(lines.at(-1)).toBe('حان وقت صلاة العصر')
  expect(notes).toEqual(['صلاة العصر بعد ٢٠ دقيقة'])
  await shown.unmount()
})

test('off clears the status line', { options: { ...AT_MUNICH, salah: 'off' } }, async ($, on) => {
  engineBand(on)
  const lines: (string | undefined)[] = []
  on('ui.status', async (_$, e) => (lines.push(e.text), { value: undefined }))

  const shown = await $.ui.mount(band('terminal'))
  expect(lines).toEqual([undefined])
  await shown.unmount()
})

test('reminder: the line is empty until the window, counts down, calls, then clears', { options: AT_MUNICH }, async ($, on) => {
  const clock = mock.clock(on, { now: Date.parse('2026-10-10T11:30:00Z') })
  engineBand(on)
  const lines = statusLines(on)

  const shown = await $.ui.mount(band('terminal'))
  expect(lines.at(-1)).toBe(undefined)
  await clock.advance(129 * 60_000)
  expect(lines.at(-1)).toBe('☾ العصر بعد ٢٠ دقيقة')
  await clock.advance(20 * 60_000 + 30_000)
  expect(lines.at(-1)).toBe('حان وقت صلاة العصر')
  await clock.advance(16 * 60_000)
  expect(lines.at(-1)).toBe(undefined)
  await shown.unmount()
})

test('a shorter reminder moves the window; no adhan skips the call', { options: { ...AT_MUNICH, salahReminder: 5, salahAdhan: false } }, async ($, on) => {
  const clock = mock.clock(on, { now: Date.parse('2026-10-10T13:44:00Z') })
  engineBand(on)
  const lines = statusLines(on)

  const shown = await $.ui.mount(band('terminal'))
  expect(lines.at(-1)).toBe(undefined)
  await clock.advance(10 * 60_000)
  expect(lines.at(-1)).toBe('☾ العصر بعد ٥ دقائق')
  await clock.advance(20 * 60_000)
  expect(lines.at(-1)).toBe(undefined)
  await shown.unmount()
})

import { ATHKAR_QUIET, configRows } from '../fixtures/config.ts'
import type { JsonValue, On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { ATHKAR } from '../../src/features/athkar/data.ts'
import { emptyDay, listFor, TITLE } from '../../src/features/athkar/logic.ts'
import { stripTashkeel } from '../../src/shared/arabic/visual.ts'

const SURFACES = ['terminal', 'desktop'] as const

// The engine's own band, beneath the plugin.
const engineBand = (on: On, surface: 'terminal' | 'desktop' = 'desktop') => {
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
  on('config.list', async () => ({ value: configRows }))
  on('session.surface', async () => ({ value: surface }))
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
  surface === 'desktop' ? /class="(cover cv-inline|peek cv-peek)"/.test(await picture(ui)) : (await ui.find({ in: 'athkar', text: stripTashkeel(TITLE.morning) })) !== undefined

const press = (ui: Ui, key: string) => ui.post({ act: 'key', key })

test('the cover folds when faded, opens on a click that does not count, then starts, then clicks count', async ($, on) => {
  mock.clock(on, { now: MORNING })
  mock.store(on, { arabicTerminals: { unknown: 'plain' }, salahSetupLater: true })
  mock.env(on, {})
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


test('Quran passages have names and desktop reading reserves room for the label', async ($, on) => {
  const notes = Object.fromEntries(ATHKAR.filter(thikr => thikr.note).map(thikr => [thikr.id, thikr.note]))
  expect(notes).toEqual({
    '75': 'آية الكرسي · البقرة ٢٥٥',
    '76-ikhlas': 'سورة الإخلاص',
    '76-falaq': 'سورة الفلق',
    '76-nas': 'سورة الناس',
  })

  mock.clock(on, { now: MORNING })
  mock.store(on, { arabicTerminals: { unknown: 'plain' }, salahSetupLater: true })
  mock.env(on, {})
  engineBand(on)
  await $.command.run({ command: 'athkar', args: 'morning reset', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  const ui = await $.ui.mount(band('desktop'))
  await press(ui, 'return')
  await press(ui, 'return')
  let html = await picture(ui)
  expect(html).toContain('آية الكرسي · ١ مِنْ')
  expect(html).toContain('<div style="--pos-room:150px" class="pglow')
  expect(html).toContain('<span class="pos" style="--pos-room:150px">')
  expect(html).toContain('left: calc(16px + var(--ax, 0px) + var(--pos-room, 60px))')
  expect(Number((await ui.find({ in: 'athkar', type: 'Svg' }))?.props.height) - 20).toBe(77)

  // Four next-key presses move past the three named surahs to the first dua.
  for (let i = 0; i < 4; i++) await press(ui, 'left')
  html = await picture(ui)
  expect(html).toContain('<span class="pos" style="--pos-room:60px">٥ مِنْ')
  expect(html).not.toContain('آية الكرسي')
  expect(html).not.toContain('سورة الإخلاص')
  await ui.unmount()
})

test('the desktop band draws in Tajawal at the slot width', async ($, on) => {
  mock.clock(on, { now: MORNING })
  mock.store(on, { arabicTerminals: { unknown: 'plain' }, salahSetupLater: true })
  mock.env(on, {})
  engineBand(on)
  const ui = await $.ui.mount(band('desktop'))
  const svg = await ui.find({ in: 'athkar', type: 'Svg' })
  expect(String(svg?.props.source)).toContain('font-family: "Tajawal"')
  // Over the desktop's card it asks for the widest Svg and the desktop narrows it to the slot.
  expect(svg?.props.width).toBe(4096)
  const root = String(svg?.props.source).split('>')[0]
  expect(root).toContain('width="100%"')
  expect(root).not.toContain('viewBox')
  expect(root).not.toContain('preserveAspectRatio')
  expect(await ui.find({ type: 'Client' })).toBeDefined()
  await ui.unmount()
})

test('the shared desktop Client hovers the × and lights a press before the hooks answer', async ($, on) => {
  mock.clock(on, { now: MORNING })
  mock.store(on, { arabicTerminals: { unknown: 'plain' }, salahSetupLater: true })
  mock.env(on, {})
  engineBand(on)
  // Hold the hooks' answer so the drawing thread must light the press itself.
  on('ui.message', { element: 'athkar' }, async () => ({}))
  const ui = await $.ui.mount(band('desktop'))
  await ui.resize({ columns: 100, rows: 3, in: 'athkar' })
  expect(await picture(ui)).toContain('class="peek cv-peek"')
  await ui.pointer({ type: 'move', x: 2, y: 0, in: 'athkar' })
  expect(await picture(ui)).toContain('class="x xabs hot"')
  await ui.pointer({ type: 'leave', x: 2, y: 0, in: 'athkar' })
  expect(await picture(ui)).toContain('class="x xabs"')
  await ui.pointer({ type: 'down', x: 40, y: 0, button: 'left', in: 'athkar' })
  expect(await picture(ui)).toContain('class="cover cv-inline"')
  expect(Number((await ui.find({ in: 'athkar', type: 'Svg' }))?.props.height)).toBe(97)
  await ui.unmount()
})

test('the reader moves on by itself after the last count', async ($, on) => {
  const clock = mock.clock(on, { now: MORNING })
  mock.store(on, { arabicTerminals: { unknown: 'plain' }, salahSetupLater: true })
  mock.env(on, {})
  engineBand(on)
  const ui = await $.ui.mount(band('terminal'))
  // The first press wakes the folded cover, the next starts the reading.
  await press(ui, 'return')
  await press(ui, 'return')

  await press(ui, 'space')
  await clock.advance(700)
  expect(await ui.find({ in: 'athkar', text: /٢ من/ })).toBeDefined()
  await ui.unmount()
})

test('finishing shows the end, and × hides the band keeping the reading', { timeoutMs: 20000 }, async ($, on) => {
  mock.clock(on, { now: MORNING })
  mock.store(on, { arabicTerminals: { unknown: 'plain' }, salahSetupLater: true })
  mock.env(on, {})
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
  expect(status.text).toContain('| Morning | Today\'s morning athkar | done ✓ |')
  await ui.unmount()
})

test('/athkar shows status and brings a hidden band back', async ($, on) => {
  mock.clock(on, { now: MORNING })
  mock.store(on, { arabicTerminals: { unknown: 'plain' }, salahSetupLater: true })
  mock.env(on, {})
  engineBand(on)
  const ui = await $.ui.mount(band('terminal'))
  await ui.post({ act: 'hide' })
  const ran = await $.command.run({ command: 'athkar', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect(ran.text).toContain('| Style | The look; sky is desktop only | sky |')
  // The period it just brought back is no longer marked hidden in the same reply.
  expect(ran.text).toContain('| Morning | Today\'s morning athkar | not started |')
  expect(await ui.find({ in: 'athkar', text: stripTashkeel(TITLE.morning) })).toBeDefined()
  await ui.unmount()
})

test('every reminder off draws nothing above the prompt by itself', { options: ATHKAR_QUIET }, async ($, on) => {
  mock.clock(on, { now: MORNING })
  mock.store(on, { arabicTerminals: { unknown: 'plain' }, salahSetupLater: true })
  mock.env(on, {})
  engineBand(on)
  const ui = await $.ui.mount(band('terminal'))
  expect(await ui.find({ type: 'Client' })).toBeUndefined()
  await ui.unmount()
})

test('faded, the reading folds to one row; a press opens it without counting', async ($, on) => {
  const clock = mock.clock(on, { now: MORNING })
  mock.store(on, { arabicTerminals: { unknown: 'plain' }, salahSetupLater: true })
  mock.env(on, {})
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
  mock.store(on, { arabicTerminals: { unknown: 'plain' }, salahSetupLater: true })
  mock.env(on, {})
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
  mock.store(on, { arabicTerminals: { unknown: 'plain' }, salahSetupLater: true })
  mock.env(on, {})
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

test('sky is desktop only: the terminal draws the frame, and /athkar style there changes nothing', async ($, on) => {
  mock.clock(on, { now: MORNING })
  mock.store(on, { arabicTerminals: { unknown: 'plain' }, salahSetupLater: true })
  mock.env(on, {})
  engineBand(on, 'terminal')
  const writes: unknown[] = []
  on('config.set', async (_$, e) => (writes.push(e), { value: e.value }))
  const ui = await $.ui.mount(band('terminal'))
  expect((await ui.find({ in: 'athkar', type: 'Box' }))?.props.borderStyle).toBe('round')
  await ui.unmount()

  const run = (args: string) => $.command.run({ command: 'athkar', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  expect((await run('')).text).toContain('| frame (terminal) |')
  expect((await run('style sky')).text).toContain('sky is desktop only')
  expect(writes).toEqual([])
})

const NIGHT = new Date(2026, 9, 10, 22, 0).getTime()
// A store that keeps what is written, so a test can read the saved day.
const keptStore = (on: On, day?: unknown) => {
  const kept: { day: any } = { day }
  on('store.get', async (_$, e) => ({ value: e.key === 'salahSetupLater' ? true : e.key === 'arabicTerminals' ? { unknown: 'plain' } : e.key === 'athkar' ? kept.day : undefined }))
  on('store.set', async (_$, e) => {
    if (e.key === 'athkar') kept.day = e.value

    return { value: undefined }
  })

  return kept
}
const run = (args: string) => ({ command: 'athkar', args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } })

test('/athkar morning opens the morning reader at night and counts go to it', async ($, on) => {
  mock.clock(on, { now: NIGHT })
  const kept = keptStore(on)
  mock.env(on, {})
  engineBand(on, 'terminal')
  expect((await $.command.run(run('morning'))).text).toBe('morning athkar open above the prompt')
  const ui = await $.ui.mount(band('terminal'))
  expect(await ui.find({ in: 'athkar', text: stripTashkeel(TITLE.morning) })).toBeDefined()
  await press(ui, 'return')
  await press(ui, 'return')
  await press(ui, 'space')
  const saved = kept.day as { morning: { counts: Record<string, number> }; evening: { counts: Record<string, number> } }
  expect(Object.keys(saved.morning.counts).length).toBeGreaterThan(0)
  expect(Object.keys(saved.evening.counts)).toHaveLength(0)
  // Picking the other period switches back.
  await $.command.run(run('evening'))
  expect(await ui.find({ in: 'athkar', text: stripTashkeel(TITLE.evening) })).toBeDefined()
  await ui.unmount()
})

test('/athkar morning replies with the reset hint when that period is done, and reset still works', async ($, on) => {
  mock.clock(on, { now: NIGHT })
  const day = { ...emptyDay('2026-10-10'), morning: { index: 0, counts: {}, isDone: true, isHidden: true }, evening: { index: 0, counts: {}, isDone: false, isHidden: false } }
  const kept = keptStore(on, day)
  mock.env(on, {})
  engineBand(on, 'terminal')
  expect((await $.command.run(run('morning'))).text).toBe('morning athkar are done today: /athkar morning reset → to read again')
  const saved = kept.day as typeof day
  expect(saved.morning.isHidden).toBe(false)
  expect((await $.command.run(run('morning reset'))).text).toBe('morning athkar start again from the first')
  expect((kept.day as typeof day).morning.isDone).toBe(false)
})

for (const surface of SURFACES) {
  for (const [name, at, before, after] of [
    ['Fajr', Date.parse('2026-10-10T03:42:00Z'), 'evening', 'morning'],
    ['Maghrib', Date.parse('2026-10-10T16:35:00Z'), 'morning', 'evening'],
  ] as const) {
    test(`${surface}: automatic period wakes exactly at ${name} with show off`, {
      options: { salahPlace: 'Munich, Germany; 48.1372, 11.5755; Europe/Berlin; DE', salahShow: 'off', salahAthan: false },
    }, async ($, on) => {
      const clock = mock.clock(on, { now: at - 1 })
      mock.store(on, { arabicTerminals: { unknown: 'plain' }, salahSetupLater: true })
      mock.env(on, {})
      engineBand(on, surface)
      const ui = await $.ui.mount(band(surface))
      const title = async (period: 'morning' | 'evening') => surface === 'desktop'
        ? (await picture(ui)).includes(TITLE[period])
        : (await ui.find({ in: 'athkar', text: stripTashkeel(TITLE[period]) })) !== undefined
      expect(await title(before)).toBe(true)
      // Let prayer tracking initialize. Asr's untouched offer has expired,
      // so the automatic morning/evening reader keeps the band.
      await clock.advance(0)
      expect(await title(before)).toBe(true)
      await clock.advance(1)
      expect(await title(after)).toBe(true)
      await ui.unmount()
    })
  }
}

test('desktop: the minute redraw follows real sunrise even in a manually chosen set with show off', {
  options: { salahPlace: 'Munich, Germany; 48.1372, 11.5755; Europe/Berlin; DE', salahShow: 'off', salahAthan: false },
}, async ($, on) => {
  // Munich sunrise is 07:26 local (05:26 UTC); the fixed-hour sky is already sunrise.
  const clock = mock.clock(on, { now: Date.parse('2026-10-10T05:25:00Z') })
  mock.store(on, { arabicTerminals: { unknown: 'plain' }, salahSetupLater: true })
  mock.env(on, {})
  engineBand(on, 'desktop')
  await $.command.run(run('evening'))
  const ui = await $.ui.mount(band('desktop'))
  const model = async () => (await ui.find({ type: 'Client', key: 'athkar' }))?.props.props
  expect(await model()).toMatchObject({ sky: 'dawn', period: 'evening' })
  await clock.advance(60_000)
  expect(await model()).toMatchObject({ sky: 'sunrise', period: 'evening' })
  await ui.unmount()
})

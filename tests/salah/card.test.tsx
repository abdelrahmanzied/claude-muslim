import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { cardHeight, FOCUS_GRACE_MS, frameOf, IDLE_MS, KEY_REST_MS, LEAVE_MS, REST_PX } from '../../src/shared/card/card.ts'
import { athanFrame, athanSvg, CARD_MS, FOLD_MS } from '../../src/features/salah/card.ts'
import { FRAME_MS, HOLD_MS, ROWS_COUNT, TOTAL_MS } from '../../src/features/salah/minaret.ts'
import { terminalArabic } from '../../src/shared/arabic/terminal.ts'
import { athanText } from '../../src/shared/pray/line.ts'
import { salahHelp } from '../../src/features/salah/help.ts'
import { DEMO_FOLDED_MS, DEMO_OPEN_MS } from '../../src/features/salah/demo.ts'

const MUNICH = { salahPlace: 'Munich, Germany; 48.1372, 11.5755; Europe/Berlin; DE' }
const NOW = Date.parse('2026-10-10T10:00:00Z')

const run = (args: string) => ({
  command: 'salah',
  args,
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 80 },
})

const band = (surface: 'terminal' | 'desktop') => ({
  plugin: 'muslim',
  surface,
  component: 'AbovePrompt' as const,
  requestId: 'band',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 10 }, view: {} },
})

const engineBand = (on: On) =>
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })

const props = (photo: string, pray: 'maghrib' | 'fajr', time: string) => ({ isActive: true, isFolded: false, now: 0, pray, time, photo, width: 800, card: { ch: 8.4, lh: 20 } })

test('the card markup: the shared card holding the photo, the font and both lines in Arabic', { options: { athkar: false } }, async () => {
  const svg = athanSvg(props('QUJD', 'maghrib', '18:05'), { hoverClose: false, columns: 0 })

  expect(svg).toContain('data:image/jpeg;base64,QUJD')
  expect(svg).toContain('data:font/woff2;base64,')
  expect(svg).toContain('حان وقت صلاة المغرب')
  expect(svg).toContain('١٨:٠٥')
  expect(svg).toContain('class="x xabs">×</span>')
  expect(svg).toContain(`height="${frameOf(athanFrame(props('', 'fajr', ''))).height}"`)
  expect(svg.length).toBeLessThan(131072)
  // The athkar band's open height, whatever the width.
  expect(athanFrame(props('', 'fajr', '')).height).toBe(cardHeight())
  expect(athanSvg(props('QUJD', 'fajr', '05:00'), { hoverClose: true, columns: 0 })).toContain('class="x xabs hot"')
})

test('the card with the real photo (about 40 KB of base64) stays far under the Svg limit', () => {
  expect(athanSvg(props('A'.repeat(45000), 'fajr', '05:00'), { hoverClose: false, columns: 180 }).length).toBeLessThan(110000)
})

test('/salah athan demo without a city says so', { options: { athkar: false } }, async $ => {
  expect((await $.command.run(run('athan demo'))).text).toContain('/salah city')
})

test('/salah athan test is an unknown word and answers with help', { options: MUNICH }, async $ => {
  expect((await $.command.run(run('athan test'))).text).toBe(salahHelp())
})

test('/salah athan demo answers without changing settings, the store or the shown-once mark', { options: MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.clock(on, { now: NOW })
  const written: unknown[] = []
  on('config.set', async (_$, e) => (written.push(e), { value: e.value }))
  on('store.set', async (_$, e, next) => {
    written.push(e)

    return next(e)
  })
  on('state.set', { plugin: 'muslim', key: 'salahAthanShown' }, async (_$, e, next) => {
    written.push(e)

    return next(e)
  })
  const ran = await $.command.run(run('athan demo'))

  expect(ran.text).toBe('**Athan demo:** Dhuhr')
  expect(written).toEqual([])
})

test('on the desktop the demo shows the shared card, never the minaret; a click on its × clears it', { options: MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  mock.clock(on, { now: NOW })
  engineBand(on)
  const asked: string[] = []
  on('fs.read', async (_$, e) => (asked.push(e.path), { value: { base64: 'QUJD' } }))
  const desktop = await $.ui.mount(band('desktop'))
  await $.command.run(run('athan demo'))

  const card = await desktop.find({ in: 'salah-athan', type: 'Svg' })
  expect(card).toBeDefined()
  expect(Number(card?.props.height)).toBe(cardHeight() + 20)
  expect(asked).toEqual([expect.stringMatching(/src\/features\/salah\/assets\/haram\.jpg$/)])
  expect(await desktop.find({ text: '▐███▌' })).toBeUndefined()
  // A click on the card away from the × leaves it.
  await desktop.post({ act: 'pointer', button: 'left', x: 60, y: 2, columns: 100, rows: 5 }, { in: 'salah-athan' })
  expect(await desktop.find({ in: 'salah-athan', type: 'Svg' })).toBeDefined()
  await desktop.post({ act: 'pointer', button: 'left', x: 2, y: 1, columns: 100, rows: 5 }, { in: 'salah-athan' })
  expect(await desktop.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
  expect(await desktop.find({ in: 'athkar', type: 'Svg' })).toBeDefined()
  expect(await desktop.find({ type: 'Svg' })).toBeUndefined()
})

test('the athan replaces only the desktop band, hovers the shared ×, and returns the saved reading', { options: MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  const clock = mock.clock(on, { now: NOW })
  engineBand(on)
  on('fs.read', async () => ({ value: { base64: 'QUJD' } }))
  const desktop = await $.ui.mount(band('desktop'))
  await desktop.key({ key: 'return', in: 'athkar' })
  await desktop.key({ key: 'return', in: 'athkar' })
  await desktop.key({ key: 'space', in: 'athkar' })
  const before = (await desktop.find({ type: 'Client', key: 'athkar' }))?.props.props
  expect(before).toMatchObject({ phase: 'reading', count: 1 })
  await $.command.run(run('athan demo'))
  expect(await desktop.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
  await desktop.resize({ columns: 100, rows: 5, in: 'salah-athan' })
  await desktop.pointer({ type: 'move', x: 2, y: 1, in: 'salah-athan' })
  expect(String((await desktop.find({ in: 'salah-athan', type: 'Svg' }))?.props.source)).toContain('class="x xabs hot"')
  await desktop.pointer({ type: 'leave', x: 2, y: 1, in: 'salah-athan' })
  expect(String((await desktop.find({ in: 'salah-athan', type: 'Svg' }))?.props.source)).toContain('class="x xabs"')
  const terminal = await $.ui.mount(band('terminal'))
  expect(await terminal.find({ type: 'Client', key: 'athkar' })).toBeDefined()
  expect(await terminal.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
  expect(await terminal.find({ text: '▐███▌' })).toBeDefined()
  await desktop.pointer({ type: 'down', x: 2, y: 1, button: 'left', in: 'salah-athan' })
  expect(await desktop.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
  expect((await desktop.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ phase: 'reading', count: 1 })
  // Let the counted thikr advance before checking the expiry path as well.
  await clock.advance(1000)
  const resumed = (await desktop.find({ type: 'Client', key: 'athkar' }))?.props.props as { thikrId: string; count: number }
  await $.command.run(run('athan demo'))
  expect(await desktop.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
  await clock.advance(CARD_MS)
  expect(await desktop.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
  expect((await desktop.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ thikrId: resumed.thikrId, count: resumed.count })
  await desktop.unmount()
  await terminal.unmount()
})

test('on the terminal the demo plays the minaret only, no card', { options: MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  mock.clock(on, { now: NOW })
  engineBand(on)
  const terminal = await $.ui.mount(band('terminal'))
  await $.command.run(run('athan demo'))

  expect(await terminal.find({ type: 'Svg' })).toBeUndefined()
  expect(await terminal.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
  expect(await terminal.find({ text: '▐███▌' })).toBeDefined()
})

for (const surface of ['desktop', 'terminal'] as const) {
  test(`${surface}: athan demo before the first draw survives ticker startup`, { options: MUNICH }, async ($, on) => {
    mock.env(on, {})
    mock.store(on)
    const clock = mock.clock(on, { now: NOW })
    engineBand(on)
    on('fs.read', async () => ({ value: { base64: 'QUJD' } }))
    await $.command.run(run('athan demo'))
    const mounted = await $.ui.mount(band(surface))

    if (surface === 'desktop') {
      expect(await mounted.find({ in: 'salah-athan', type: 'Svg' })).toBeDefined()
      expect(await mounted.find({ text: '▐███▌' })).toBeUndefined()
    } else {
      expect(await mounted.find({ type: 'Svg' })).toBeUndefined()
      expect(await mounted.find({ text: '▐███▌' })).toBeDefined()
    }
    await clock.settle()
    if (surface === 'desktop') {
      expect(await mounted.find({ in: 'salah-athan', type: 'Svg' })).toBeDefined()
      await clock.advance(CARD_MS)
      expect(await mounted.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
      expect(await mounted.find({ type: 'Svg' })).toBeUndefined()
    } else {
      expect(await mounted.find({ text: '▐███▌' })).toBeDefined()
      await clock.advance((ROWS_COUNT - 1) * FRAME_MS)
      expect(await mounted.find({ text: '☾' })).toBeDefined()
      await clock.advance(FRAME_MS + HOLD_MS)
      expect(await mounted.find({ text: '▐███▌' })).toBeUndefined()
    }
  })
}

// 13:01:45 in Munich; Dhuhr is at 13:02.
const BEFORE_DHUHR = Date.parse('2026-10-10T11:01:45Z')

test('the real desktop athan folds, reopens until idle, then closes at its original deadline', { options: MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  const clock = mock.clock(on, { now: BEFORE_DHUHR })
  engineBand(on)
  on('fs.read', async () => ({ value: { base64: 'QUJD' } }))
  const desktop = await $.ui.mount(band('desktop'))
  await clock.advance(15_000)
  const picture = () => desktop.find({ in: 'salah-athan', type: 'Svg' })
  expect(Number((await picture())?.props.height)).toBe(cardHeight() + 20)
  await clock.advance(FOLD_MS)
  expect(Number((await picture())?.props.height)).toBe(REST_PX + 20)
  expect(String((await picture())?.props.source)).toContain('حان وقت صلاة الظهر')
  expect(String((await picture())?.props.source)).toContain('١٣:٠٢')
  expect(await desktop.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
  await desktop.post({ act: 'pointer', button: 'left', x: 60, y: 1, columns: 100, rows: 2 }, { in: 'salah-athan' })
  expect(Number((await picture())?.props.height)).toBe(cardHeight() + 20)
  await clock.advance(IDLE_MS - 1)
  expect(Number((await picture())?.props.height)).toBe(cardHeight() + 20)
  await clock.advance(1)
  expect(Number((await picture())?.props.height)).toBe(REST_PX + 20)
  await clock.advance(CARD_MS - FOLD_MS - IDLE_MS)
  expect(await desktop.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
  expect(await desktop.find({ type: 'Client', key: 'athkar' })).toBeDefined()
})

for (const scenario of ['leave', 'return', 'idle', 'keys', 'focus', 'grace', 'first', 'first-leave', 'input-idle'] as const) {
  test(`real athan rest: ${scenario}; expiry stays fixed`, { options: MUNICH }, async ($, on) => {
    mock.env(on, {})
    mock.store(on)
    const clock = mock.clock(on, { now: BEFORE_DHUHR })
    engineBand(on)
    on('fs.read', async () => ({ value: { base64: 'QUJD' } }))
    on('ui.focus', { component: 'AbovePrompt' }, async () => ({}))
    const states: unknown[] = []
    on('state.set', { plugin: 'muslim', key: 'salahCard' }, async (_$, e, next) => {
      states.push(e.value)
      return next(e)
    })
    const desktop = await $.ui.mount(band('desktop'))
    await clock.advance(15_000)
    const initial = states[states.length - 1] as { until: number }
    const picture = () => desktop.find({ in: 'salah-athan', type: 'Svg' })
    const height = async () => Number((await picture())?.props.height)
    const post = (act: 'enter' | 'leave') => desktop.post({ act }, { in: 'salah-athan' })
    const focus = (plugin?: string) => $.ui.focus({ component: 'AbovePrompt', requestId: 'band', plugin, origin: { kind: 'person' } })
    const first = scenario === 'first' || scenario === 'first-leave'
    if (!first) {
      await clock.advance(FOLD_MS)
      await desktop.post({ act: 'pointer', button: 'left', x: 60, y: 1, columns: 100, rows: 2 }, { in: 'salah-athan' })
      expect(states[states.length - 1]).toMatchObject({ isFolded: false, foldsAt: BEFORE_DHUHR + 15_000 + FOLD_MS + IDLE_MS, until: initial.until })
    }
    expect(await height()).toBe(cardHeight() + 20)
    if (scenario === 'leave' || scenario === 'first-leave') {
      if (first) await post('enter')
      await post('leave')
      await clock.advance(LEAVE_MS - 1)
      expect(await height()).toBe(cardHeight() + 20)
      await clock.advance(1)
    } else if (scenario === 'return') {
      await post('leave')
      await clock.advance(LEAVE_MS - 1)
      await post('enter')
      await clock.advance(LEAVE_MS + KEY_REST_MS)
      expect(await height()).toBe(cardHeight() + 20)
    } else if (scenario === 'keys') {
      await post('leave')
      await desktop.key({ key: 'space', in: 'salah-athan' })
      await clock.advance(KEY_REST_MS - 1)
      expect(await height()).toBe(cardHeight() + 20)
      await desktop.key({ key: 'right', in: 'salah-athan' })
      await clock.advance(KEY_REST_MS - 1)
      expect(await height()).toBe(cardHeight() + 20)
      await clock.advance(1)
    } else if (scenario === 'focus' || scenario === 'grace') {
      if (scenario === 'grace') {
        await clock.advance(FOCUS_GRACE_MS)
        await focus()
        expect(await height()).toBe(cardHeight() + 20)
        await clock.advance(1)
      } else await clock.advance(FOCUS_GRACE_MS + 1)
      await focus('muslim')
      expect(await height()).toBe(cardHeight() + 20)
      await focus('other-plugin')
    } else {
      if (scenario === 'input-idle') {
        await clock.advance(IDLE_MS - 1)
        await desktop.key({ key: 'right', in: 'salah-athan' })
      }
      await clock.advance((first ? FOLD_MS : IDLE_MS) - 1)
      expect(await height()).toBe(cardHeight() + 20)
      await clock.advance(1)
    }
    expect(await height()).toBe((scenario === 'return' ? cardHeight() : REST_PX) + 20)
    expect(states[states.length - 1]).toMatchObject({ isFolded: scenario !== 'return', until: initial.until })
    for (const state of states) expect(state).toMatchObject({ until: initial.until })
  })
}

test('the folded desktop × closes without reopening', { options: MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  const clock = mock.clock(on, { now: BEFORE_DHUHR })
  engineBand(on)
  on('fs.read', async () => ({ value: { base64: 'QUJD' } }))
  const desktop = await $.ui.mount(band('desktop'))
  await clock.advance(15_000)
  expect(await desktop.find({ in: 'salah-athan', type: 'Svg' })).toBeDefined()
  await clock.advance(FOLD_MS)
  await desktop.post({ act: 'pointer', button: 'left', x: 2, y: 1, columns: 100, rows: 2 }, { in: 'salah-athan' })
  expect(await desktop.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
  await clock.advance(CARD_MS)
  expect(await desktop.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
})

test('the desktop demo opens, folds after DEMO_OPEN_MS, and is gone DEMO_FOLDED_MS later', { options: MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  const clock = mock.clock(on, { now: NOW })
  engineBand(on)
  on('fs.read', async () => ({ value: { base64: 'QUJD' } }))
  const desktop = await $.ui.mount(band('desktop'))
  await $.command.run(run('athan demo'))
  const picture = () => desktop.find({ in: 'salah-athan', type: 'Svg' })
  expect(Number((await picture())?.props.height)).toBe(cardHeight() + 20)
  await clock.advance(DEMO_OPEN_MS)
  expect(Number((await picture())?.props.height)).toBe(REST_PX + 20)
  await clock.advance(DEMO_FOLDED_MS)
  expect(await desktop.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
  expect(await desktop.find({ type: 'Client', key: 'athkar' })).toBeDefined()
})

for (const ending of ['close', 'expire'] as const) {
  test(`terminal demo rises, folds through Arabic, then ${ending}`, { options: MUNICH }, async ($, on) => {
    mock.env(on, { TERM_PROGRAM: 'Apple_Terminal' })
    mock.store(on, { arabicTerminals: { 'Apple_Terminal': 'reversed' } })
    const clock = mock.clock(on, { now: NOW })
    engineBand(on)
    const cleared: string[] = []
    on('state.set', async (_$, e, next) => {
      if (e.value === null) cleared.push(e.key)
      return next(e)
    })
    await $.command.run(run('athan demo'))
    const terminal = await $.ui.mount(band('terminal'))
    expect(await terminal.find({ text: '▐███▌' })).toBeDefined()
    expect(await terminal.find({ type: 'Button', key: 'salah-athan-close' })).toBeDefined()
    await clock.advance(TOTAL_MS)
    expect(await terminal.find({ text: '▐███▌' })).toBeUndefined()
    expect(await terminal.find({ type: 'Text', text: '☾' })).toBeDefined()
    expect(await terminal.find({ type: 'Text', text: terminalArabic('terminal', 'reversed', athanText('dhuhr')) })).toBeDefined()
    expect(await terminal.find({ type: 'Button', key: 'salah-athan-close' })).toMatchObject({ props: { label: '×' } })
    if (ending === 'close') await terminal.press({ key: 'salah-athan-close' })
    else await clock.advance(CARD_MS - TOTAL_MS)
    expect(await terminal.find({ key: 'salah-athan-row' })).toBeUndefined()
    expect(cleared).toContain('salahMinaret')
    expect(cleared).toContain('salahCard')
    await clock.advance(CARD_MS)
    expect(await terminal.find({ text: '▐███▌' })).toBeUndefined()
  })
}

for (const elapsed of [FRAME_MS, 10_000, FOLD_MS, CARD_MS]) {
  test(`reload restores both surfaces at ${elapsed}ms and re-arms remaining timers`, { options: { ...MUNICH, salahShow: 'off' } }, async ($, on) => {
    mock.env(on, {})
    mock.store(on)
    const clock = mock.clock(on, { now: NOW + elapsed })
    engineBand(on)
    on('fs.read', async () => ({ value: { base64: 'QUJD' } }))
    const seed: Record<string, unknown> = {
      salahCard: { pray: 'asr', time: '15:59', isFolded: false, foldsAt: NOW + FOLD_MS, until: NOW + CARD_MS },
      salahMinaret: { pray: 'asr', frame: 1, isFolded: false, startedAt: NOW, foldsAt: NOW + TOTAL_MS, until: NOW + CARD_MS },
    }
    const cleared: string[] = []
    on('state.get', async (_$, e, next) => {
      const actual = await next(e)
      return e.key in seed ? { value: { value: seed[e.key], version: actual.value?.version ?? 0 } } : actual
    })
    on('state.set', async (_$, e, next) => {
      delete seed[e.key]
      if (e.value === null) cleared.push(e.key)
      return next(e)
    })
    const desktop = await $.ui.mount(band('desktop'))
    const terminal = await $.ui.mount(band('terminal'))
    const picture = elapsed < CARD_MS ? await desktop.find({ in: 'salah-athan', type: 'Svg' }) : undefined
    if (elapsed >= CARD_MS) {
      expect(picture).toBeUndefined()
      expect(await terminal.find({ key: 'salah-athan-row' })).toBeUndefined()
    } else {
      expect(Number(picture?.props.height)).toBe((elapsed >= FOLD_MS ? REST_PX : cardHeight()) + 20)
      if (elapsed < TOTAL_MS) {
        expect(await terminal.find({ text: '▐███▌' })).toBeDefined()
        expect(await terminal.find({ text: '│▒│' })).toBeDefined()
      } else expect(await terminal.find({ key: 'salah-athan-row' })).toBeDefined()
    }
    await clock.settle()
    await clock.advance(Math.max(0, FOLD_MS - elapsed))
    if (elapsed < CARD_MS) expect(Number((await desktop.find({ in: 'salah-athan', type: 'Svg' }))?.props.height)).toBe(REST_PX + 20)
    await clock.advance(CARD_MS)
    expect(await desktop.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
    expect(await terminal.find({ key: 'salah-athan-close' })).toBeUndefined()
    expect(cleared).toContain('salahCard')
    expect(cleared).toContain('salahMinaret')
  })
}

test('terminal × during the rise cancels later frames and folds', { options: MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  const clock = mock.clock(on, { now: NOW })
  engineBand(on)
  await $.command.run(run('athan demo'))
  const terminal = await $.ui.mount(band('terminal'))
  await terminal.press({ key: 'salah-athan-close' })
  await clock.advance(TOTAL_MS + FOLD_MS)
  expect(await terminal.find({ text: '▐███▌' })).toBeUndefined()
  expect(await terminal.find({ key: 'salah-athan-row' })).toBeUndefined()
})

test("reload preserves a reopened card's later fold but its original expiry", { options: { ...MUNICH, salahShow: 'off' } }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  const clock = mock.clock(on, { now: NOW + 2 * FOLD_MS })
  engineBand(on)
  on('fs.read', async () => ({ value: { base64: 'QUJD' } }))
  let seeded = true
  on('state.get', { plugin: 'muslim', key: 'salahCard' }, async (_$, e, next) => {
    const actual = await next(e)
    return seeded ? { value: { value: { pray: 'asr', time: '15:59', isFolded: false, foldsAt: NOW + 3 * FOLD_MS, until: NOW + CARD_MS }, version: actual.value?.version ?? 0 } } : actual
  })
  on('state.set', { plugin: 'muslim', key: 'salahCard' }, async (_$, e, next) => {
    seeded = false
    return next(e)
  })
  const desktop = await $.ui.mount(band('desktop'))
  expect(Number((await desktop.find({ in: 'salah-athan', type: 'Svg' }))?.props.height)).toBe(cardHeight() + 20)
  await clock.settle()
  await clock.advance(FOLD_MS)
  expect(Number((await desktop.find({ in: 'salah-athan', type: 'Svg' }))?.props.height)).toBe(REST_PX + 20)
  await clock.advance(CARD_MS - 3 * FOLD_MS)
  expect(await desktop.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
})

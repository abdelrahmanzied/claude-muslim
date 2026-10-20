import { ATHKAR_QUIET, configRows } from '../fixtures/config.ts'
import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { cardHeight, closeArea, FOCUS_GRACE_MS, frameOf, IDLE_MS, KEY_REST_MS, LEAVE_MS, REST_PX } from '../../src/shared/card/card.ts'
import { athanFrame, athanSvg, CARD_MS, FOLD_MS, isOnStart, startArea, startHitArea, START_LABEL, START_MARGIN } from '../../src/features/salah/card.ts'
import { FRAME_MS, HOLD_MS, ROWS_COUNT, TOTAL_MS } from '../../src/features/salah/minaret.ts'
import { terminalArabic } from '../../src/shared/arabic/terminal.ts'
import { athanText } from '../../src/shared/pray/line.ts'
import { salahHelp } from '../../src/features/salah/help.ts'
import { demoDuration as afterDuration } from '../../src/features/athkar/demo.ts'
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

const engineBand = (on: On, surface: 'desktop' | 'terminal' = 'desktop') => {
  on('session.surface', async () => ({ value: surface }))
  return on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
}

const props = (photo: string, pray: 'maghrib' | 'fajr', time: string) => ({ isActive: true, isFolded: false, now: 0, pray, time, photo, width: 800, card: { ch: 8.4, lh: 20 } })

test('the card markup: the shared card holding the photo, the font and both lines in Arabic', { options: { ...ATHKAR_QUIET } }, async () => {
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

test('/salah demo works without a city', { options: { ...ATHKAR_QUIET } }, async ($, on) => {
  mock.clock(on, { now: NOW })
  on('session.surface', async () => ({ value: 'desktop' }))
  expect((await $.command.run(run('demo'))).text).toBe('**Salah demo:** athan · Fajr 05:00 · athkar after salah. It shows once the setup above is answered.')
})

test('/salah athan test is an unknown word and answers with help', { options: MUNICH }, async $ => {
  expect((await $.command.run(run('athan test'))).text).toBe(salahHelp())
})

for (const surface of ['desktop', 'terminal'] as const) {
  test(`${surface}: the retired nested demo command answers with help and starts nothing`, { options: { ...ATHKAR_QUIET } }, async ($, on) => {
    mock.env(on, {})
    mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
    mock.clock(on, { now: NOW })
    engineBand(on)
    const written: unknown[] = []
    on('config.list', async () => ({ value: configRows }))
    on('config.set', async (_$, e) => (written.push(e), { value: e.value }))
    on('store.set', { key: /.*/ }, async (_$, e, next) => {
      written.push(e)

      return next(e)
    })
    const ui = await $.ui.mount(band(surface))

    expect((await $.command.run(run('athan demo'))).text).toBe(salahHelp())
    expect(await ui.find({ key: 'salah-athan' })).toBeUndefined()
    expect(await ui.find({ text: 'حان وقت صلاة الفجر' })).toBeUndefined()
    expect(written).toEqual([])
  })
}

test('/salah demo answers without changing settings, the store or the shown-once mark', { options: MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.clock(on, { now: NOW })
  const written: unknown[] = []
  on('config.list', async () => ({ value: configRows }))
  on('config.set', async (_$, e) => (written.push(e), { value: e.value }))
  on('store.set', async (_$, e, next) => {
    written.push(e)

    return next(e)
  })
  on('state.set', { plugin: 'muslim' }, async (_$, e, next) => {
    written.push(e)

    return next(e)
  })
  on('session.surface', async () => ({ value: 'desktop' }))
  const ran = await $.command.run(run('demo'))

  expect(ran.text).toBe('**Salah demo:** athan · Fajr 05:00 · athkar after salah')
  expect(written).toEqual([])
})

test('on the desktop the demo shows the shared card, never the minaret; a click on its × clears it', { options: MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
  mock.clock(on, { now: NOW })
  engineBand(on)
  const asked: string[] = []
  on('fs.read', async (_$, e) => (asked.push(e.path), { value: { base64: 'QUJD' } }))
  const desktop = await $.ui.mount(band('desktop'))
  await $.command.run(run('demo'))

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
  expect(await desktop.find({ in: 'athkar-demo', type: 'Svg' })).toBeDefined()
  expect(await desktop.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
})

test('the demo hovers the shared × and preserves the saved reading', { options: MUNICH, timeoutMs: 15000 }, async ($, on) => {
  mock.env(on, {})
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
  const clock = mock.clock(on, { now: NOW })
  engineBand(on)
  on('fs.read', async () => ({ value: { base64: 'QUJD' } }))
  const desktop = await $.ui.mount(band('desktop'))
  await $.command.run({ ...run('morning'), command: 'athkar' })
  await desktop.key({ key: 'return', in: 'athkar' })
  await desktop.key({ key: 'space', in: 'athkar' })
  const before = (await desktop.find({ type: 'Client', key: 'athkar' }))?.props.props
  expect(before).toMatchObject({ phase: 'reading', count: 1 })
  await $.command.run(run('demo'))
  expect((await desktop.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ phase: 'reading', count: 1 })
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
  expect((await desktop.find({ type: 'Client', key: 'athkar-demo' }))?.props.props).toMatchObject({ period: 'afterSalah', phase: 'reading', count: 0 })
  await clock.advance(afterDuration('sky', 3200, 'afterSalah'))
  expect((await desktop.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ phase: 'reading' })
  // Let the counted thikr advance before checking the expiry path as well.
  await clock.advance(1000)
  const resumed = (await desktop.find({ type: 'Client', key: 'athkar' }))?.props.props as { thikrId: string; count: number }
  await $.command.run(run('demo'))
  await clock.advance(DEMO_OPEN_MS + DEMO_FOLDED_MS + afterDuration('sky', 3200, 'afterSalah'))
  expect(await desktop.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
  expect((await desktop.find({ type: 'Client', key: 'athkar' }))?.props.props).toMatchObject({ thikrId: resumed.thikrId, count: resumed.count })
  await desktop.unmount()
  await terminal.unmount()
})

test('on the terminal the demo plays the minaret only, no card', { options: MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
  mock.clock(on, { now: NOW })
  engineBand(on, 'terminal')
  const terminal = await $.ui.mount(band('terminal'))
  await $.command.run(run('demo'))

  expect(await terminal.find({ type: 'Svg' })).toBeUndefined()
  expect(await terminal.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
  expect(await terminal.find({ text: '▐███▌' })).toBeDefined()
})

for (const surface of ['desktop', 'terminal'] as const) {
  test(`${surface}: salah demo before the first draw survives ticker startup`, { options: MUNICH }, async ($, on) => {
    mock.env(on, {})
    mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
    const clock = mock.clock(on, { now: NOW })
    engineBand(on, surface)
    on('fs.read', async () => ({ value: { base64: 'QUJD' } }))
    await $.command.run(run('demo'))
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
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
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
    mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
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
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
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
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
  const clock = mock.clock(on, { now: NOW })
  engineBand(on)
  on('fs.read', async () => ({ value: { base64: 'QUJD' } }))
  const desktop = await $.ui.mount(band('desktop'))
  await $.command.run(run('demo'))
  const picture = () => desktop.find({ in: 'salah-athan', type: 'Svg' })
  expect(Number((await picture())?.props.height)).toBe(cardHeight() + 20)
  await clock.advance(DEMO_OPEN_MS)
  expect(Number((await picture())?.props.height)).toBe(REST_PX + 20)
  await clock.advance(DEMO_FOLDED_MS)
  expect(await desktop.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
  expect(await desktop.find({ type: 'Client', key: 'athkar-demo' })).toBeDefined()
})

for (const ending of ['close', 'expire'] as const) {
  test(`terminal demo rises, folds through Arabic, then ${ending}`, { options: MUNICH }, async ($, on) => {
    mock.env(on, { TERM_PROGRAM: 'Apple_Terminal' })
    mock.store(on, { arabicTerminals: { 'Apple_Terminal': 'reversed' } })
    const clock = mock.clock(on, { now: NOW })
    engineBand(on, 'terminal')
    const cleared: string[] = []
    on('state.set', async (_$, e, next) => {
      if (e.value === null) cleared.push(e.key)
      return next(e)
    })
    await $.command.run(run('demo'))
    const terminal = await $.ui.mount(band('terminal'))
    expect(await terminal.find({ text: '▐███▌' })).toBeDefined()
    expect(await terminal.find({ type: 'Button', key: 'salah-athan-close' })).toBeDefined()
    await clock.advance(TOTAL_MS)
    expect(await terminal.find({ text: '▐███▌' })).toBeUndefined()
    expect(await terminal.find({ type: 'Text', text: '☾' })).toBeDefined()
    expect(await terminal.find({ type: 'Text', text: terminalArabic('terminal', 'reversed', athanText('fajr')) })).toBeDefined()
    expect(await terminal.find({ type: 'Button', key: 'salah-athan-close' })).toMatchObject({ props: { label: '×' } })
    if (ending === 'close') await terminal.press({ key: 'salah-athan-close' })
    else await clock.advance(DEMO_FOLDED_MS)
    expect(await terminal.find({ key: 'salah-athan-row' })).toBeUndefined()
    expect(cleared.filter(key => key === 'salahMinaret' || key === 'salahCard')).toEqual([])
    await clock.advance(CARD_MS)
    expect(await terminal.find({ text: '▐███▌' })).toBeUndefined()
  })
}

for (const elapsed of [FRAME_MS, 10_000, FOLD_MS, CARD_MS]) {
  test(`reload restores both surfaces at ${elapsed}ms and re-arms remaining timers`, { options: { ...MUNICH, salahShow: 'off' } }, async ($, on) => {
    mock.env(on, {})
    mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
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
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
  const clock = mock.clock(on, { now: NOW })
  engineBand(on, 'terminal')
  await $.command.run(run('demo'))
  const terminal = await $.ui.mount(band('terminal'))
  await terminal.press({ key: 'salah-athan-close' })
  await clock.advance(TOTAL_MS + FOLD_MS)
  expect(await terminal.find({ text: '▐███▌' })).toBeUndefined()
  expect(await terminal.find({ key: 'salah-athan-row' })).toBeUndefined()
})

test("reload preserves a reopened card's later fold but its original expiry", { options: { ...MUNICH, salahShow: 'off' } }, async ($, on) => {
  mock.env(on, {})
  mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
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

for (const surface of ['desktop', 'terminal'] as const) {
  for (const ending of ['close', 'expire'] as const) {
    test(`${surface}: demo ${ending} restores a real athan without writing its state`, { options: { ...ATHKAR_QUIET, salahShow: 'off', salahAthan: false } }, async ($, on) => {
      mock.env(on, {})
      const clock = mock.clock(on, { now: NOW })
      on('store.get', async (_$, e) => ({ value: e.key === 'salahSetupLater' ? true : { unknown: 'plain' } }))
      engineBand(on, surface)
      on('fs.read', async () => ({ value: { base64: 'QUJD' } }))
      const realCard = { pray: 'asr', time: '15:59', isFolded: true, foldsAt: NOW - 1, until: NOW + CARD_MS }
      const realMinaret = { pray: 'asr', frame: 1, isFolded: true, startedAt: NOW - TOTAL_MS, foldsAt: NOW - 1, until: NOW + CARD_MS }
      const written: unknown[] = []
      const seed: Record<string, unknown> = { salahCard: realCard, salahMinaret: realMinaret }
      on('state.get', async (_$, e, next) => {
        const actual = await next(e)
        return e.key in seed ? { value: { value: seed[e.key], version: actual.value?.version ?? 0 } } : actual
      })
      on('state.set', async (_$, e, next) => {
        written.push(e)
        if (e.key in seed) seed[e.key] = e.value
        return next(e)
      })
      on('config.list', async () => ({ value: configRows }))
      on('config.set', async (_$, e) => (written.push(e), { value: e.value }))
      on('store.set', async (_$, e) => (written.push(e), { value: undefined }))
      on('store.delete', async (_$, e) => (written.push(e), { value: undefined }))
      on('ui.focus', { component: 'AbovePrompt' }, async () => ({}))
      const ui = await $.ui.mount(band(surface))
      await clock.settle() // Let the existing moment's normal timers initialize.
      written.length = 0
      const shown = async () => surface === 'desktop'
        ? String((await ui.find({ in: 'salah-athan', type: 'Svg' }))?.props.source)
        : JSON.stringify(await ui.findAll({ type: 'Text' }))
      expect(await shown()).toContain('حان وقت صلاة العصر')
      expect((await $.command.run(run('demo'))).text).toBe('**Salah demo:** athan · Fajr 05:00 · athkar after salah')
      await clock.advance(TOTAL_MS)
      expect(await shown()).toContain('حان وقت صلاة الفجر')
      if (surface === 'desktop') expect(await shown()).toContain('٠٥:٠٠')
      // Demo pointer/key/focus input must not engage or fold the real card.
      if (surface === 'desktop') {
        await ui.post({ act: 'enter' }, { in: 'salah-athan' })
        await ui.post({ act: 'key', key: 'space' }, { in: 'salah-athan' })
        await ui.post({ act: 'leave' }, { in: 'salah-athan' })
        await $.ui.focus({ component: 'AbovePrompt', requestId: 'band', plugin: 'other', origin: { kind: 'person' } })
      }
      if (ending === 'close') {
        if (surface === 'desktop') await ui.post({ act: 'hide' }, { in: 'salah-athan' })
        else await ui.press({ key: 'salah-athan-close' })
      } else await clock.advance((surface === 'desktop' ? DEMO_OPEN_MS : TOTAL_MS) + DEMO_FOLDED_MS - TOTAL_MS)
      expect(await ui.find({ type: 'Client', key: 'athkar-demo' })).toBeDefined()
      await clock.advance(afterDuration('sky', 3200, 'afterSalah'))
      expect(await shown()).toContain('حان وقت صلاة العصر')
      expect(seed).toEqual({ salahCard: realCard, salahMinaret: realMinaret })
      expect(written).toEqual([])
      await ui.unmount()
    })
  }
}

// Dhuhr 13:02 in Munich is 11:02:00Z. A reload or a late tick first draws the band 3 or 10 minutes after.
for (const late of [3, 10]) {
  test(`the athan card still shows when the first tick comes ${late} minutes after the call, and ends 15 minutes after it`, { options: MUNICH }, async ($, on) => {
    mock.env(on, {})
    mock.store(on, { salahSetupLater: true, arabicTerminals: { unknown: 'plain' } })
    const clock = mock.clock(on, { now: Date.parse('2026-10-10T11:02:00Z') + late * 60_000 })
    engineBand(on)
    on('fs.read', async () => ({ value: { base64: 'QUJD' } }))
    const desktop = await $.ui.mount(band('desktop'))
    await clock.advance(1000)
    expect(await desktop.find({ in: 'salah-athan', type: 'Svg' })).toBeDefined()
    expect(await desktop.find({ type: 'Client', key: 'athkar' })).toBeUndefined()
    await clock.advance((15 - late) * 60_000)
    expect(await desktop.find({ type: 'Client', key: 'salah-athan' })).toBeUndefined()
  })
}

for (const isFolded of [false, true]) {
  {
    test(`after-salah control retains the card look, fits the Svg budget and hits independently of ×: ${isFolded ? 'folded' : 'open'}`, () => {
      const p = { ...props('A'.repeat(45000), 'fajr', '05:00'), canStart: true, isFolded, accent: 'blue' as const }
      const svg = athanSvg(p, { hoverClose: false, hoverAction: true, columns: 100 })
      expect(svg).toContain(START_LABEL)
      expect(svg).toContain('حان وقت صلاة الفجر')
      expect(svg).toContain('٠٥:٠٠')
      expect(svg).toContain('class="start hot"')
      expect(svg).toContain('<span class="start-arrow">← </span><span class="start-label">')
      expect(svg).toContain('left: calc(35px + var(--ax, 0px))')
      expect(svg).toContain('font: 700 15px/1 "Aref Ruqaa", serif; color: #fff')
      expect(svg).toContain('color: var(--start-accent); filter: brightness(1.15)')
      expect(svg).not.toContain('has-start')
      expect(svg).not.toContain('--start-ink')
      expect(svg).not.toContain('background: var(--start-accent)')
      const frame = athanFrame(p, 100)
      const box = frameOf(frame)
      const area = startArea(frame)
      // CSS left is relative to the band's padded shell; pointers are relative
      // to the slot. Reconstruct the drawn rectangle in slot coordinates.
      const drawnLeft = box.padX + 35 + box.addX - box.left
      const drawnTop = (box.height - 2 * box.padY - 24) / 2 + box.padY - box.top
      expect(area).toEqual({ x0: drawnLeft, x1: drawnLeft + 107.4, y0: drawnTop, y1: drawnTop + 24 })
      expect(svg).toContain(`width: ${area.x1 - area.x0}px; height: 24px`)
      expect(area.x0).toBeGreaterThan(closeArea(frame).x1)
      // The whole frame and its margin hit, short of the ×; just past the margin misses.
      const hit = (px: number, py: number) => isOnStart(p, (px + box.left) / p.card.ch - .5, (py + box.top) / p.card.lh - .5, 100, 5)
      const cx = (area.x0 + area.x1) / 2
      const cy = (area.y0 + area.y1) / 2
      for (let x = area.x0 + .01; x < area.x1; x += 2) for (let y = area.y0 + .01; y < area.y1; y += 2) expect(hit(x, y)).toBe(true)
      const m = startHitArea(frame)
      expect(m).toEqual({ x0: Math.max(area.x0 - START_MARGIN.x, closeArea(frame).x1 + 1), x1: area.x1 + START_MARGIN.x, y0: area.y0 - START_MARGIN.y, y1: area.y1 + START_MARGIN.y })
      expect(m.x0).toBeGreaterThan(closeArea(frame).x1)
      expect(hit(m.x0 + .01, cy)).toBe(true)
      expect(hit(m.x1 - .01, cy)).toBe(true)
      expect(hit(cx, m.y0 + .01)).toBe(true)
      expect(hit(cx, m.y1 - .01)).toBe(true)
      expect(hit(m.x0 - .01, cy)).toBe(false)
      expect(hit(m.x1 + .01, cy)).toBe(false)
      expect(hit(cx, m.y0 - .01)).toBe(false)
      expect(hit(cx, m.y1 + .01)).toBe(false)
      // Both palettes, picked by the app's appearance; nothing from Claude Code's theme.
      expect(svg).toContain('.band.athan { --start-accent: #4a7fc0; }')
      expect(svg).toContain('@media (prefers-color-scheme: light) { .band.athan { --start-accent: #3a6aa3; } }')
      expect(svg).not.toContain('data-theme')
      expect(svg.length).toBeLessThan(131072)
      expect(isOnStart(p, 10, isFolded ? 1 : 2, 100, isFolded ? 2 : 5)).toBe(true)
      expect(isOnStart(p, 2, 1, 100, 5)).toBe(false)
      expect(isOnStart(p, 50, 1, 100, 5)).toBe(false)
      expect(isOnStart({ ...p, canStart: false }, 10, 1, 100, 5)).toBe(false)
    })
  }
}

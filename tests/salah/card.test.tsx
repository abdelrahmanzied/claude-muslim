import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { cardHeight, frameOf } from '../../src/shared/card/card.ts'
import { athanFrame, athanSvg, CARD_MS } from '../../src/features/salah/card.ts'
import { FRAME_MS, HOLD_MS, ROWS_COUNT } from '../../src/features/salah/minaret.ts'
import { salahHelp } from '../../src/features/salah/help.ts'

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

const props = (photo: string, pray: 'maghrib' | 'fajr', time: string) => ({ isActive: true, now: 0, pray, time, photo, width: 800, card: { ch: 8.4, lh: 20 } })

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

test('a minaret left by a reload is cleared after rendering, not during it', { options: MUNICH }, async ($, on) => {
  mock.env(on, {})
  mock.store(on)
  const clock = mock.clock(on, { now: NOW })
  engineBand(on)
  let isStale = true
  on('state.get', { plugin: 'muslim', key: 'salahMinaret' }, async (_$, e, next) =>
    isStale ? { value: { value: { pray: 'isha', frame: ROWS_COUNT }, version: 1 } } : next(e),
  )
  on('state.set', { plugin: 'muslim', key: 'salahMinaret' }, async (_$, e, next) => {
    const result = await next(e)
    if (e.value === null) isStale = false

    return result
  })
  const terminal = await $.ui.mount(band('terminal'))

  expect(await terminal.find({ text: '▐███▌' })).toBeDefined()
  expect(isStale).toBe(true)
  await clock.settle()
  expect(isStale).toBe(false)
  const redrawn = await $.ui.mount({ ...band('terminal'), requestId: 'after-cleanup' })
  expect(await redrawn.find({ text: '▐███▌' })).toBeUndefined()
})

import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { CARD_HEIGHT, cardSvg, cardWidth } from '../../src/features/salah/card.ts'

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

test('the card markup: photo, font, both lines in Arabic, no bar', async () => {
  const svg = cardSvg('QUJD', 'maghrib', '18:05', 800)

  expect(svg).toContain('data:image/jpeg;base64,QUJD')
  expect(svg).toContain('data:font/woff2;base64,')
  expect(svg).toContain('حان وقت صلاة المغرب')
  expect(svg).toContain('١٨:٠٥')
  expect(svg).not.toContain('<animate')
  expect(svg).toContain('@keyframes rise')
  expect(svg).toContain('prefers-reduced-motion')
  expect(svg).toContain('class="close"')
  expect(svg).toContain(`height="${CARD_HEIGHT}"`)
  expect(svg.length).toBeLessThan(131072)
  expect(cardWidth(100)).toBeGreaterThan(840)
})

test('the card with the real photo (about 40 KB of base64) stays far under the Svg limit', () => {
  expect(cardSvg('A'.repeat(45000), 'fajr', '05:00', 1500).length).toBeLessThan(110000)
})

test('/salah athan test without a city says so', async $ => {
  expect((await $.command.run(run('athan test'))).text).toContain('/salah city')
})

test('/salah athan test answers and changes no setting', { options: MUNICH }, async ($, on) => {
  mock.clock(on, { now: NOW })
  const written: unknown[] = []
  on('config.set', async (_$, e) => (written.push(e), { value: e.value }))
  const ran = await $.command.run(run('athan test'))

  expect(ran.text).toContain('Showing the athan moment')
  expect(written).toEqual([])
})

test('on the desktop the test shows the card with a close, never the minaret; × clears it', { options: MUNICH }, async ($, on) => {
  mock.clock(on, { now: NOW })
  engineBand(on)
  const asked: string[] = []
  on('fs.read', async (_$, e) => (asked.push(e.path), { value: { base64: 'QUJD' } }))
  const desktop = await $.ui.mount(band('desktop'))
  await $.command.run(run('athan test'))

  const card = await desktop.find({ type: 'Svg' })
  expect(card).toBeDefined()
  expect(asked).toEqual([expect.stringMatching(/src\/features\/salah\/assets\/haram\.jpg$/)])
  expect(card?.props.isInteractive).toBeUndefined()
  expect(await desktop.find({ text: '▐███▌' })).toBeUndefined()
  const close = await desktop.find({ type: 'Button', key: 'salah-athan-close' })
  expect(close).toBeDefined()
  await desktop.press({ key: 'salah-athan-close' })
  expect(await desktop.find({ type: 'Svg' })).toBeUndefined()
})

test('on the terminal the test plays the minaret only, no card', { options: MUNICH }, async ($, on) => {
  mock.clock(on, { now: NOW })
  engineBand(on)
  const terminal = await $.ui.mount(band('terminal'))
  await $.command.run(run('athan test'))

  expect(await terminal.find({ type: 'Svg' })).toBeUndefined()
  expect(await terminal.find({ text: '▐███▌' })).toBeDefined()
})

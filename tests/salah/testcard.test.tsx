import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { CARD_MS, testCardSvg } from '../../src/features/salah/testcard.ts'

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

test('the card markup carries the photo, both lines in Arabic, one colour and the shrinking bar', async () => {
  const svg = testCardSvg('QUJD', 'asr', '15:59')

  expect(svg).toContain('data:image/jpeg;base64,QUJD')
  expect(svg).toContain('حان وقت صلاة العصر')
  expect(svg).toContain('العصر · ١٥:٥٩')
  expect(svg).toContain('rgb(215,119,87)')
  expect(svg).toContain(`dur="${CARD_MS / 1000}s"`)
  expect(svg.length).toBeLessThan(131072)
})

test('/salah athan test without a city says so', async $ => {
  expect((await $.command.run(run('athan test'))).text).toContain('/salah city')
})

test('/salah athan test answers and changes no setting', { options: MUNICH }, async ($, on) => {
  mock.clock(on, { now: NOW })
  const written: unknown[] = []
  on('config.set', async (_$, e) => (written.push(e), { value: e.value }))
  const ran = await $.command.run(run('athan test'))

  expect(ran.text).toContain('Playing the athan moment')
  expect(written).toEqual([])
})

test('on the desktop the card shows as an interactive Svg, on the terminal it does not', { options: MUNICH }, async ($, on) => {
  mock.clock(on, { now: NOW })
  engineBand(on)
  const asked: string[] = []
  on('fs.read', async (_$, e) => (asked.push(e.path), { value: { base64: 'QUJD' } }))
  const desktop = await $.ui.mount(band('desktop'))
  const terminal = await $.ui.mount(band('terminal'))
  await $.command.run(run('athan test'))

  expect(asked).toEqual([expect.stringMatching(/src\/features\/salah\/assets\/haram\.jpg$/)])
  const card = await desktop.find({ type: 'Svg' })
  expect(card).toBeDefined()
  expect(card?.props.isInteractive).toBe(true)
  expect(await terminal.find({ type: 'Svg' })).toBeUndefined()
})

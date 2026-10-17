import { expect, mock, test } from 'claude-code/testing'

import { VERSION } from '../../src/constants.ts'

const muslim = (args: string) => ({
  command: 'muslim',
  args,
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 80 },
})

test('/muslim feedback replies at once and starts the turn from a timer', async ($, on) => {
  const clock = mock.clock(on)
  const submitted: string[] = []
  mock.env(on, {})
  on('session.surface', async () => ({ value: 'terminal' }))
  on('prompt.submit', async (_$, e) => (submitted.push(e.text), { text: e.text }))
  const ran = await $.command.run(muslim('feedback the pane is cut off'))

  expect(ran.text).toContain('Nothing is sent until you say yes')
  expect(submitted).toEqual([])
  await clock.advance(1000)
  expect(submitted).toHaveLength(1)
  expect(submitted[0]).toContain('the pane is cut off')
  expect(submitted[0]).toContain(`muslim version: ${VERSION}`)
  expect(submitted[0]).toContain('Surface: terminal')
  expect(submitted[0]).toContain('explicit yes')
})

test('with no text, and on Windows, the prompt still starts', async ($, on) => {
  const clock = mock.clock(on)
  const submitted: string[] = []
  mock.env(on, { OS: 'Windows_NT' })
  on('session.surface', async () => ({ value: 'desktop' }))
  on('prompt.submit', async (_$, e) => (submitted.push(e.text), { text: e.text }))
  await $.command.run(muslim('feedback'))
  await clock.advance(1000)

  expect(submitted[0]).toContain('They wrote nothing after the command.')
  expect(submitted[0]).toContain('Operating system: Windows')
})

test('a dropped or refused submit gives a toast', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  let refuse = false
  mock.env(on, {})
  on('session.surface', async () => ({ value: 'terminal' }))
  on('ui.toast', async (_$, e) => (toasts.push(e.text), { value: undefined }))
  on('prompt.submit', async () => {
    if (refuse) throw new Error('refused')
    return { drop: 'busy' }
  })
  await $.command.run(muslim('feedback'))
  await clock.advance(1000)
  refuse = true
  await $.command.run(muslim('feedback'))
  await clock.advance(1000)

  expect(toasts.filter(text => text.includes('Could not start the feedback'))).toHaveLength(2)
})

test('/muslim feedback is listed in help', async $ => {
  expect((await $.command.run(muslim('help'))).text).toContain('| `/muslim feedback` |')
  expect((await $.command.run(muslim('help feedback'))).text).toContain('| `/muslim feedback` |')
})

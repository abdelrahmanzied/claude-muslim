import { expect, test } from 'claude-code/testing'

test('/muslim answers with version', async $ => {
  const ran = await $.command.run({
    command: 'muslim',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  })

  expect(ran.text).toBe('muslim v0.2.0')
})

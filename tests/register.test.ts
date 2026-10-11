import { expect, test } from 'claude-code/testing'

const muslim = (args: string) => ({
  command: 'muslim',
  args,
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 80 },
})

test('/muslim answers with version and a hint', async $ => {
  const ran = await $.command.run(muslim(''))

  expect(ran.text).toBe('muslim v0.2.0\n\nHelp: /muslim help')
})

test('/muslim help includes the shared Arabic setting and existing thikr command', async $ => {
  const all = (await $.command.run(muslim('help'))).text
  expect(all).toContain('/muslim arabic-fix on | off | auto')
  expect(all).toContain('/thikr')
  expect(all).not.toContain('/salah')
  expect((await $.command.run(muslim('help arabic-fix'))).text).toContain('/muslim arabic-fix')
})

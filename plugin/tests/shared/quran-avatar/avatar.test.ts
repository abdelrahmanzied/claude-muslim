import { expect, test } from 'claude-code/testing'
import { avatarSvg } from '../../../src/shared/quran-avatar/index.ts'
test('avatar moves only while playing and elapsed/size inputs stay finite', () => {
  const playing = avatarSvg(true, 1500, 96), idle = avatarSvg(false, NaN, 96)
  expect(playing).toContain('kbx-root running')
  expect(playing).toContain('--quran-time:-1.5s')
  expect(idle).toContain('kbx-root idle')
  expect(idle).not.toContain('NaN')
  expect(playing).toContain('xmlns="http://www.w3.org/2000/svg"')
  expect(playing).toContain('width="96"')
})

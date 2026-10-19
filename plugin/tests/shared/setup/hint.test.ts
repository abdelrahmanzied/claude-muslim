import { expect, test } from 'claude-code/testing'
import { withSetupHint } from '../../../src/shared/setup/hint.ts'

test('setup hint separates an unfinished sentence and trims trailing whitespace', () => {
  expect(withSetupHint('morning athkar open above the prompt  ', true)).toBe('morning athkar open above the prompt. It shows once the setup above is answered.')
})

test('setup hint keeps existing terminal punctuation', () => {
  for (const mark of ['.', '!', '?', ':']) {
    expect(withSetupHint(`Preview${mark}  `, true)).toBe(`Preview${mark} It shows once the setup above is answered.`)
  }
})

test('no setup leaves the original reply unchanged, including whitespace', () => {
  expect(withSetupHint('Preview  ', false)).toBe('Preview  ')
})

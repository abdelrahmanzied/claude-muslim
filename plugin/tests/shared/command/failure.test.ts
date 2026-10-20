import { expect, test } from 'claude-code/testing'
import { commandFailure } from '../../../src/shared/command/failure.ts'

test('command failure names the command and trims its arguments', () => {
  expect(commandFailure('athkar', '  morning  ', { kind: 'throw', message: 'EPERM: operation not permitted' })).toBe('Could not complete /athkar morning: EPERM: operation not permitted. Try again.')
  expect(commandFailure('muslim', '  ', undefined)).toBe('Could not complete /muslim. Try again.')
})

test('thrown reasons fit one line and never add a second trailing period', () => {
  expect(commandFailure('athkar', 'morning', { kind: 'throw', message: '  EPERM:\n operation\t not permitted.  ' })).toBe('Could not complete /athkar morning: EPERM: operation not permitted. Try again.')
  expect(commandFailure('quran', '', { kind: 'throw', message: 'Failed...' })).toBe('Could not complete /quran: Failed. Try again.')
})

test('long thrown reasons are cut to 160 characters with an ellipsis', () => {
  expect(commandFailure('quran', 'play', { kind: 'throw', message: 'x'.repeat(161) })).toBe(`Could not complete /quran play: ${'x'.repeat(159)}…. Try again.`)
  expect(commandFailure('quran', 'play', { kind: 'throw', message: 'x'.repeat(160) })).toBe(`Could not complete /quran play: ${'x'.repeat(160)}. Try again.`)
})

test('timeouts use a readable reason regardless of the captured message', () => {
  expect(commandFailure('salah', 'city', { kind: 'timeout', message: 'internal detail' })).toBe('Could not complete /salah city: it took too long. Try again.')
})

test('absent, empty and unknown failures omit the reason', () => {
  for (const error of [undefined, { kind: 'throw' }, { kind: 'throw', message: ' \n ' }, { kind: 'throw', message: '.' }, { kind: 're-entry', message: 'ignored' }, { kind: 'unknown', message: 'ignored' }]) {
    expect(commandFailure('athkar', 'morning', error)).toBe('Could not complete /athkar morning. Try again.')
  }
})

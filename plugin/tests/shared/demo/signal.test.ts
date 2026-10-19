import { expect, test } from 'claude-code/testing'
import { cancelDemo, connectDemo, doneDemo, failDemo, onDemoDone, onDemoFailure, startDemo } from '../../../src/shared/demo/signal.ts'
test('the shared bus waits for a feature report, forwards completion and cancellation', async () => {
  const calls: string[] = []
  connectDemo('afterSalah', finished => { calls.push('start'); finished?.(); return '' }, () => { calls.push('cancel') })
  onDemoDone(feature => { calls.push(feature) }); onDemoFailure(() => { calls.push('failure') })
  await startDemo('afterSalah', () => { calls.push('continuation') })
  expect(calls).toEqual(['start', 'continuation'])
  doneDemo('salah'); cancelDemo('afterSalah'); failDemo()
  expect(calls).toEqual(['start', 'continuation', 'salah', 'cancel', 'failure'])
  onDemoDone(); onDemoFailure()
})
